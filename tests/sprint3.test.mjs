import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { demo, demoPeople } from "../src/lib/demo.ts";
import {
  conceptsSchema,
  emptyPlanning,
  planningSchema,
  proposalDataSchema,
  proposalText,
} from "../supabase/functions/_shared/planning.ts";
import { generateStructured } from "../supabase/functions/_shared/gemini.ts";
import { preparePlanning } from "../supabase/functions/_shared/planning-service.ts";
import { createPlanningHandler } from "../supabase/functions/_shared/planning-handler.ts";
import {
  createWorkspaceApi,
  SessionExpiredError,
  authErrorMessage,
} from "../src/lib/workspace-api.ts";
class Storage {
  values = new Map();
  getItem(k) {
    return this.values.get(k) ?? null;
  }
  setItem(k, v) {
    this.values.set(k, String(v));
  }
  removeItem(k) {
    this.values.delete(k);
  }
}
beforeEach(() => {
  globalThis.localStorage = new Storage();
  globalThis.sessionStorage = new Storage();
});
const fixture = () => demo.login(demoPeople[0].id).briefs[0];
const command = (b, s, action, extra = {}) => ({
  action,
  briefId: b.id,
  briefVersion: b.version,
  expectedRevision: s.revision,
  ...extra,
});
async function generated() {
  const b = fixture();
  const s = await demo.planning(
    command(b, emptyPlanning(1), "generateConcepts"),
  );
  return { b, s };
}
async function proposed() {
  let { b, s } = await generated();
  s = await demo.planning(
    command(b, s, "select", { conceptId: s.concepts[0].id }),
  );
  s = await demo.planning(command(b, s, "generateProposal"));
  return { b, s };
}
test("brief → concepts → selection → proposal → manual save → export preserves version and authors", async () => {
  let { b, s } = await proposed();
  assert.equal(s.concepts.length, 3);
  assert.equal(s.proposal.version, 1);
  assert.equal(s.proposal.status, "Draft");
  const old = s.proposal.data;
  demo.login(demoPeople[1].id);
  s = await demo.planning(
    command(b, s, "saveProposal", {
      data: { ...old, theme: "Manually revised theme" },
    }),
  );
  assert.equal(s.history.length, 2);
  assert.deepEqual(s.history[0].data, old);
  assert.equal(s.proposal.author, demoPeople[1].name);
  const latest = await demo.planning({ action: "load", briefId: b.id });
  assert.equal(latest.proposal.version, 2);
  assert.match(proposalText(latest.proposal), /Manually revised theme/);
  assert.match(proposalText(latest.proposal), /Status: Draft/);
  assert.match(proposalText(latest.proposal), /Version: 2/);
});
test("regeneration requires confirmation, preserves manual version, and stale saves fail", async () => {
  let { b, s } = await proposed();
  s = await demo.planning(
    command(b, s, "saveProposal", {
      data: { ...s.proposal.data, theme: "Manual" },
    }),
  );
  await assert.rejects(
    () => demo.planning(command(b, s, "generateProposal")),
    /Confirm regeneration/,
  );
  const old = s;
  s = await demo.planning(command(b, s, "generateProposal", { confirm: true }));
  assert.equal(s.history[1].data.theme, "Manual");
  assert.equal(s.proposal.version, 3);
  await assert.rejects(
    () =>
      demo.planning(
        command(b, old, "saveProposal", { data: old.proposal.data }),
      ),
    /conflict/,
  );
  assert.equal(
    (await demo.planning({ action: "load", briefId: b.id })).history.length,
    3,
  );
  await assert.rejects(
    () => demo.planning(command(b, s, "generateConcepts")),
    /Confirm replacing/,
  );
  s = await demo.planning(command(b, s, "generateConcepts", { confirm: true }));
  assert.equal(s.history.length, 3);
  assert.equal(s.selectedId, null);
});
test("brief changes invalidate dependent concepts; wrong selection cannot save old proposal", async () => {
  let { b, s } = await proposed();
  s = await demo.planning(
    command(b, s, "select", { conceptId: s.concepts[1].id }),
  );
  await assert.rejects(
    () =>
      demo.planning(command(b, s, "saveProposal", { data: s.proposal.data })),
    /Generate a proposal/,
  );
  demo.save({ ...b.data, budget: b.data.budget + 1 }, b.id, 1);
  b = demo.load().briefs[0];
  await assert.rejects(
    () =>
      demo.planning(command(b, s, "select", { conceptId: s.concepts[0].id })),
    /brief changed/,
  );
  s = await demo.planning(command(b, s, "generateConcepts", { confirm: true }));
  assert.equal(s.briefVersion, 2);
  assert.equal(s.proposal.briefVersion, 1);
});
test("demo cross-agency reads and writes, missing selection and failed storage never commit", async () => {
  const { b, s } = await generated();
  await assert.rejects(
    () => demo.planning(command(b, s, "generateProposal")),
    /Select a concept/,
  );
  await assert.rejects(
    () =>
      demo.planning(
        command(b, s, "select", { conceptId: crypto.randomUUID() }),
      ),
    /Concept not found/,
  );
  demo.login(demoPeople[2].id);
  await assert.rejects(
    () => demo.planning({ action: "load", briefId: b.id }),
    /not found/,
  );
  await assert.rejects(
    () => demo.planning(command(b, s, "generateConcepts", { confirm: true })),
    /not found/,
  );
  demo.login(demoPeople[0].id);
  localStorage.setItem = () => {
    throw new Error("Storage full");
  };
  await assert.rejects(
    () =>
      demo.planning(command(b, s, "select", { conceptId: s.concepts[0].id })),
    /Storage full/,
  );
  assert.equal(
    (await demo.planning({ action: "load", briefId: b.id })).revision,
    s.revision,
  );
});
const aiConcepts = {
  concepts: [1, 2].map((i) => ({
    title: "Concept " + i,
    theme: "Theme",
    activities: ["Activity"],
    assumptions: ["Assumption"],
  })),
};
const aiResponse = (value) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(value) }] },
        },
      ],
    }),
  );
test("Gemini retries invalid JSON, invalid structure, transient HTTP and network failures", async () => {
  for (const first of [
    () => new Response("{"),
    () => aiResponse({ concepts: [] }),
    () => new Response("", { status: 429 }),
    () => new Response("", { status: 503 }),
    () => {
      throw new Error("offline");
    },
  ]) {
    let calls = 0;
    const sleeps = [];
    const result = await generateStructured(
      conceptsSchema,
      {},
      {
        apiKey: "server-only",
        model: "test-model",
        sleep: async (n) => sleeps.push(n),
        fetcher: async (_url, init) => {
          calls++;
          assert.equal(init.headers["x-goog-api-key"], "server-only");
          const body = JSON.parse(init.body);
          assert.equal(
            body.generationConfig.responseMimeType,
            "application/json",
          );
          return calls === 1 ? first() : aiResponse(aiConcepts);
        },
      },
    );
    assert.equal(result.concepts.length, 2);
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [500]);
  }
});
test("Gemini bounds retries, redacts provider secrets and does not retry permanent rejection", async () => {
  for (const status of [400, 403, 429, 503]) {
    let calls = 0;
    await assert.rejects(
      () =>
        generateStructured(
          conceptsSchema,
          {},
          {
            apiKey: "secret",
            model: "test",
            sleep: async () => {},
            fetcher: async () => {
              calls++;
              return new Response("secret-provider-details", { status });
            },
          },
        ),
      (e) => !e.message.includes("secret"),
    );
    assert.equal(calls, status >= 429 ? 3 : 1);
  }
  let calls = 0;
  await assert.rejects(
    () =>
      generateStructured(
        conceptsSchema,
        {},
        {
          apiKey: "",
          model: "test",
          fetcher: async () => {
            calls++;
          },
        },
      ),
    /not configured/,
  );
  assert.equal(calls, 0);
});
test("Gemini rejects truncated and schema-invalid output after three attempts", async () => {
  for (const response of [
    () => aiResponse({ concepts: [aiConcepts.concepts[0]] }),
    () =>
      new Response(
        JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      ),
    () =>
      new Response(
        JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
      ),
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        generateStructured(
          conceptsSchema,
          {},
          {
            apiKey: "key",
            model: "test",
            sleep: async () => {},
            fetcher: async () => {
              calls++;
              return response();
            },
          },
        ),
      /invalid response/,
    );
    assert.equal(calls, 3);
  }
});
test("shared schemas reject missing proposal sections and invalid concept counts", () => {
  assert.equal(
    proposalDataSchema.safeParse({ title: "Only title" }).success,
    false,
  );
  assert.equal(
    conceptsSchema.safeParse({
      concepts: [...aiConcepts.concepts, ...aiConcepts.concepts],
    }).success,
    false,
  );
  assert.equal(
    planningSchema.safeParse({ ...emptyPlanning(1), revision: -1 }).success,
    false,
  );
});
test("stale generation preconditions reject before invoking a paid provider", async () => {
  const b = fixture();
  let calls = 0;
  await assert.rejects(
    () =>
      preparePlanning(
        command(b, { revision: 7 }, "generateConcepts"),
        emptyPlanning(1),
        b,
        async () => {
          calls++;
        },
      ),
    /conflict/,
  );
  assert.equal(calls, 0);
});
function handlerClient({ user = true, member = true, brief = true } = {}) {
  return () => ({
    auth: {
      getUser: async () => ({
        data: { user: user ? { id: "user" } : null },
        error: null,
      }),
    },
    from(table) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          error: null,
          data:
            table === "agency_members"
              ? member
                ? { agency_id: "agency" }
                : null
              : table === "briefs"
                ? brief
                  ? { version: 1, data: fixture().data }
                  : null
                : null,
        }),
      };
      return chain;
    },
    rpc: async () => {
      throw new Error("No writes expected");
    },
  });
}
const http = (body, headers = { authorization: "Bearer test" }) =>
  new Request("http://localhost/planning", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
test("HTTP endpoint rejects missing/expired auth, missing membership and cross-agency brief before AI", async () => {
  const id = fixture().id;
  for (const [options, status] of [
    [{ user: false }, 401],
    [{ member: false }, 403],
    [{ brief: false }, 404],
  ]) {
    const handle = createPlanningHandler(
      handlerClient(options),
      () => undefined,
    );
    const result = await handle(http({ action: "load", briefId: id }));
    assert.equal(result.status, status);
  }
  const handle = createPlanningHandler(handlerClient(), () => undefined);
  assert.equal(
    (await handle(http({ action: "load", briefId: id }, {}))).status,
    401,
  );
  assert.equal((await handle(http("{invalid"))).status, 400);
  assert.equal(
    (await handle(http({ action: "load", briefId: "invalid" }))).status,
    400,
  );
  assert.equal((await handle(http("a".repeat(96001)))).status, 413);
  assert.equal(
    (await handle(http({}, { origin: "https://foreign.invalid" }))).status,
    403,
  );
  assert.equal(
    (await handle(new Request("http://localhost", { method: "GET" }))).status,
    405,
  );
  assert.equal(
    (
      await handle(
        new Request("http://localhost", {
          method: "OPTIONS",
          headers: { origin: "http://localhost:5174" },
        }),
      )
    ).status,
    204,
  );
});
test("live planning response uses dedicated function and rejects expired or signed-out responses", async () => {
  let listener;
  let finish;
  const client = {
    auth: {
      onAuthStateChange: (fn) => {
        listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
    functions: {
      invoke: async (name, { body }) => {
        assert.equal(name, "planning");
        assert.equal(body.action, "load");
        return { data: emptyPlanning(1), error: null };
      },
    },
  };
  const api = createWorkspaceApi(client);
  api.onSessionEnd(() => {});
  assert.equal(
    (await api.planning({ action: "load", briefId: fixture().id })).revision,
    0,
  );
  client.functions.invoke = () => new Promise((r) => (finish = r));
  const pending = api.planning({ action: "load", briefId: fixture().id });
  listener("SIGNED_OUT");
  finish({ data: emptyPlanning(1), error: null });
  await assert.rejects(() => pending, SessionExpiredError);
  client.functions.invoke = async () => ({
    data: null,
    error: { context: new Response("{}", { status: 401 }) },
  });
  await assert.rejects(
    () => api.planning({ action: "load", briefId: fixture().id }),
    SessionExpiredError,
  );
});
test("Sprint 2 distinguishes email/request limits from invalid credentials and unconfirmed email", async () => {
  assert.match(
    authErrorMessage({ status: 429 }),
    /limiting authentication requests/,
  );
  assert.match(
    authErrorMessage({ code: "over_email_send_rate_limit" }, true),
    /confirmation-email limit/,
  );
  assert.match(
    authErrorMessage({ code: "email_not_confirmed" }),
    /Confirm your email/,
  );
  for (const method of ["login", "register"]) {
    const client = {
      auth: {
        signInWithPassword: async () => ({ error: { status: 429 } }),
        signUp: async () => ({ error: { code: "over_email_send_rate_limit" } }),
      },
    };
    const api = createWorkspaceApi(client);
    await assert.rejects(
      () =>
        method === "login"
          ? api.login("user@example.com", "pw")
          : api.register("User Name", "user@example.com", "long-test-password"),
      method === "login"
        ? /limiting authentication requests/
        : /confirmation-email limit/,
    );
  }
});

test("retired Gemini model produces a configuration error without retrying", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      generateStructured(
        conceptsSchema,
        {},
        {
          apiKey: "key",
          model: "retired-model",
          sleep: async () => {
            throw new Error("Must not retry");
          },
          fetcher: async () => {
            calls++;
            return new Response("private provider details", { status: 404 });
          },
        },
      ),
    /model is unavailable/,
  );
  assert.equal(calls, 1);
});

test("Edge generation budget caps attempts and applies configured thinking level", async () => {
  let calls = 0;
  const waits = [];
  await assert.rejects(
    () =>
      generateStructured(
        conceptsSchema,
        {},
        {
          apiKey: "server-fixture",
          model: "gemini-3.5-flash",
          maxAttempts: 2,
          timeoutMs: 60000,
          thinkingLevel: "minimal",
          sleep: async (ms) => waits.push(ms),
          fetcher: async (_url, init) => {
            calls++;
            assert.deepEqual(
              JSON.parse(init.body).generationConfig.thinkingConfig,
              { thinkingLevel: "minimal" },
            );
            return new Response("", { status: 503 });
          },
        },
      ),
    /busy/,
  );
  assert.equal(calls, 2);
  assert.deepEqual(waits, [500]);
});
