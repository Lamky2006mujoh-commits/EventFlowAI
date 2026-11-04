import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createWorkspaceApi,
  SessionExpiredError,
} from "../src/lib/workspace-api.ts";
import { resolveBackendConfig } from "../src/lib/config.ts";
import {
  briefChanges,
  briefDataSchema,
  registrationSchema,
} from "../supabase/functions/_shared/contracts.ts";

const brief = briefDataSchema.parse({
  title: "Test event",
  client: "Test Client",
  eventType: "Workshop",
  date: "2026-11-28",
  venue: "Test Hall",
  attendees: 20,
  budget: 100000000,
  objectives: "Verify course requirements.",
  audience: "",
  constraints: "",
});
const workspace = (role) => ({
  session: {
    id: "user",
    name: "Test user",
    agencyId: "agency",
    agencyName: "Test agency",
    role,
  },
  briefs: [],
  members: [],
});
function fakeClient(role = "member") {
  const calls = [];
  let authListener;
  const client = {
    calls,
    auth: {
      signInWithPassword: async (input) => {
        calls.push(["login", input.email]);
        return { error: null };
      },
      getSession: async () => ({
        data: { session: { access_token: "test-token" } },
        error: null,
      }),
      signOut: async (input) => {
        calls.push(["logout", input.scope]);
        return { error: null };
      },
      signUp: async (input) => {
        calls.push(["signup", input]);
        return { error: null };
      },
      onAuthStateChange: (listener) => {
        authListener = listener;
        return {
          data: {
            subscription: { unsubscribe: () => calls.push(["unsubscribe"]) },
          },
        };
      },
    },
    functions: {
      invoke: async (_name, { body }) => {
        calls.push(["request", body]);
        return {
          data:
            body.action === "workspace" ? workspace(role) : { success: true },
          error: null,
        };
      },
    },
    emit: (event) => authListener?.(event),
  };
  return client;
}
test("real backend is default, legacy key works, invalid config fails closed", () => {
  assert.equal(resolveBackendConfig({}).mode, "supabase");
  assert.ok(resolveBackendConfig({}).configurationError);
  assert.equal(
    resolveBackendConfig({
      VITE_SUPABASE_URL: "https://project.supabase.co",
      VITE_SUPABASE_ANON_KEY: "public-key",
    }).configurationError,
    null,
  );
  assert.ok(
    resolveBackendConfig({
      VITE_SUPABASE_URL: "not a URL",
      VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
    }).configurationError,
  );
  assert.equal(
    resolveBackendConfig({ VITE_APP_MODE: "demo" }).configurationError,
    null,
  );
});
test("admins and members authenticate identically; role comes from server membership", async () => {
  for (const role of ["admin", "member"]) {
    const client = fakeClient(role);
    const result = await createWorkspaceApi(client).login(
      " user@example.com ",
      "password",
    );
    assert.equal(result.session.role, role);
    assert.deepEqual(client.calls[0], ["login", "user@example.com"]);
    assert.deepEqual(client.calls[1], ["request", { action: "workspace" }]);
  }
});
test("invalid credentials never load protected workspace", async () => {
  const client = fakeClient();
  client.auth.signInWithPassword = async () => ({
    error: new Error("secret backend details"),
  });
  await assert.rejects(
    () => createWorkspaceApi(client).login("a@b.com", "wrong"),
    /Sign-in failed/,
  );
  assert.equal(client.calls.length, 0);
});
test("signed-out session restores to login; expired token rejects protected request", async () => {
  const client = fakeClient();
  client.auth.getSession = async () => ({
    data: { session: null },
    error: null,
  });
  assert.equal(await createWorkspaceApi(client).restore(), null);
  client.functions.invoke = async () => ({
    error: { context: new Response("{}", { status: 401 }) },
    data: null,
  });
  await assert.rejects(
    () => createWorkspaceApi(client).load(),
    SessionExpiredError,
  );
});
test("account without membership is signed out and receives controlled denial", async () => {
  const client = fakeClient();
  client.functions.invoke = async () => ({
    error: {
      context: new Response(
        JSON.stringify({
          error: "Ask your administrator to add you to an agency.",
        }),
        { status: 403 },
      ),
    },
    data: null,
  });
  await assert.rejects(
    () => createWorkspaceApi(client).login("a@b.com", "password"),
    /administrator/,
  );
  assert.ok(client.calls.some((call) => call[0] === "logout"));
});
test("logout uses current session and auth-state listener can be cleaned up", async () => {
  const client = fakeClient();
  const api = createWorkspaceApi(client);
  let ended = 0;
  const unsubscribe = api.onSessionEnd(() => ended++);
  client.emit("TOKEN_REFRESHED");
  assert.equal(ended, 0);
  client.emit("SIGNED_OUT");
  assert.equal(ended, 1);
  await api.logout();
  assert.deepEqual(client.calls[0], ["logout", "local"]);
  unsubscribe();
  assert.deepEqual(client.calls[1], ["unsubscribe"]);
});
test("failed logout is surfaced rather than claiming success", async () => {
  const client = fakeClient();
  client.auth.signOut = async () => ({ error: new Error("offline") });
  await assert.rejects(
    () => createWorkspaceApi(client).logout(),
    /Could not sign out/,
  );
});
test("registration cannot submit a role or agency and clears auto-created session", async () => {
  const client = fakeClient();
  await createWorkspaceApi(client).register(
    "New User",
    "new@example.com",
    "a-long-test-password",
  );
  const signup = client.calls[0][1];
  assert.deepEqual(signup.options.data, { display_name: "New User" });
  assert.equal(signup.options.data.role, undefined);
  assert.deepEqual(client.calls[1], ["logout", "local"]);
  assert.equal(
    registrationSchema.safeParse({
      name: "X",
      email: "invalid",
      password: "short",
    }).success,
    false,
  );
});
test("version diff identifies changed values without mutating either snapshot", () => {
  const updated = {
    ...brief,
    budget: 150000000,
    constraints: "No outdoor stage",
  };
  assert.deepEqual(
    briefChanges(brief, updated).map((c) => [c.field, c.before, c.after]),
    [
      ["budget", 100000000, 150000000],
      ["constraints", "", "No outdoor stage"],
    ],
  );
  assert.equal(brief.budget, 100000000);
  assert.deepEqual(briefChanges(brief, { ...brief }), []);
});
test("sign-out during a pending request cannot reopen protected workspace data", async () => {
  const client = fakeClient();
  let finish;
  client.functions.invoke = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const api = createWorkspaceApi(client);
  const unsubscribe = api.onSessionEnd(() => {});
  const pending = api.load();
  client.emit("SIGNED_OUT");
  finish({ data: workspace("member"), error: null });
  await assert.rejects(() => pending, SessionExpiredError);
  unsubscribe();
});
