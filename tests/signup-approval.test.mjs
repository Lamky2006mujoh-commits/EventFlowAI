import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { createWorkspaceHandler } from "../supabase/functions/_shared/workspace-handler.ts";
import { createWorkspaceApi } from "../src/lib/workspace-api.ts";
import { registrationSchema } from "../supabase/functions/_shared/contracts.ts";
const ids = {
  admin: "81000000-0000-4000-8000-000000000001",
  other: "81000000-0000-4000-8000-000000000002",
  member: "81000000-0000-4000-8000-000000000003",
  a: "82000000-0000-4000-8000-000000000001",
  b: "82000000-0000-4000-8000-000000000002",
};
async function fixture() {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
  );
  for (const f of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + f, import.meta.url),
        "utf8",
      ),
    );
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.com',now()),($2,'other@example.com',now()),($3,'member@example.com',now())",
    [ids.admin, ids.other, ids.member],
  );
  await db.query(
    "insert into agencies(id,name) values($1,'Agency A'),($2,'Agency B')",
    [ids.a, ids.b],
  );
  await db.query(
    "insert into agency_members(user_id,agency_id,display_name,role) values($1,$2,'Admin A','admin'),($3,$4,'Admin B','admin'),($5,$2,'Member A','member')",
    [ids.admin, ids.a, ids.other, ids.b, ids.member],
  );
  const code = (
    await db.query(
      "select registration_code from agency_signup_settings where agency_id=$1",
      [ids.a],
    )
  ).rows[0].registration_code;
  let current = ids.admin;
  const asUser = async (user) => {
    current = user;
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec("set role authenticated");
  };
  const signup = async ({
    id = crypto.randomUUID(),
    confirmed = false,
    metadata = {},
    agencyCode = code,
  } = {}) => {
    await db.exec("reset role");
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,case when $3 then now() else null end,$4::jsonb)",
      [
        id,
        "applicant-" + id + "@example.com",
        confirmed,
        JSON.stringify({
          display_name: "Applicant",
          agency_code: agencyCode,
          ...metadata,
        }),
      ],
    );
    return id;
  };
  const queue = async () =>
    (await db.query("select signup_review_queue() as data")).rows[0].data;
  const review = (id, decision) =>
    db.query("select review_signup_request($1,$2)", [id, decision]);
  return { db, code, asUser, signup, queue, review, current: () => current };
}
test("signup trigger routes by agency code, ignores forged privileges, rejects invalid codes and preserves legacy accounts", async () => {
  const f = await fixture();
  try {
    assert.equal(
      registrationSchema.safeParse({
        name: "Employee",
        email: "employee@example.com",
        password: "long-password-123",
        agencyCode: "invalid",
      }).success,
      false,
    );
    const u = await f.signup({
      metadata: { role: "admin", agency_id: ids.b },
      agencyCode: f.code.toLowerCase(),
    });
    assert.equal(
      (
        await f.db.query(
          "select count(*)::int as n from agency_members where user_id=$1",
          [u],
        )
      ).rows[0].n,
      0,
    );
    const r = (
      await f.db.query(
        "select * from agency_signup_requests where user_id=$1",
        [u],
      )
    ).rows[0];
    assert.equal(r.agency_id, ids.a);
    assert.equal(r.status, "pending");
    assert.equal(r.email_confirmed, false);
    await assert.rejects(
      () => f.signup({ agencyCode: "FFFFFFFFFFFFFFFF" }),
      /Invalid agency registration code/,
    );
    const legacy = await f.signup({ agencyCode: "" });
    assert.equal(
      (
        await f.db.query(
          "select count(*)::int as n from agency_signup_requests where user_id=$1",
          [legacy],
        )
      ).rows[0].n,
      0,
    );
    await f.asUser(ids.admin);
    assert.equal((await f.queue()).pendingCount, 1);
  } finally {
    await f.db.close();
  }
});
test("only the owning admin can approve a confirmed applicant; membership and immutable review attribution are persisted", async () => {
  const f = await fixture();
  try {
    const user = await f.signup();
    await f.asUser(ids.admin);
    let q = await f.queue();
    const request = q.requests[0];
    await assert.rejects(
      () => f.review(request.id, "approve"),
      /Confirm the account email/,
    );
    await f.asUser(ids.member);
    await assert.rejects(() => f.queue(), /Administrator permission/);
    await assert.rejects(
      () => f.review(request.id, "approve"),
      /Administrator permission/,
    );
    await f.asUser(ids.other);
    assert.equal((await f.queue()).requests.length, 0);
    await assert.rejects(
      () => f.review(request.id, "approve"),
      /not found in your agency/,
    );
    await f.db.exec("reset role");
    await f.db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [user],
    );
    await f.asUser(ids.admin);
    q = await f.queue();
    assert.equal(q.requests[0].emailConfirmed, true);
    await assert.rejects(
      () => f.review(request.id, "admin"),
      /Invalid signup decision/,
    );
    await assert.rejects(
      () =>
        f.db.query("select add_agency_member($1,'Bypass','admin')", [
          request.email,
        ]),
      /Use signup request approval/,
    );
    await f.review(request.id, "approve");
    q = await f.queue();
    assert.equal(q.pendingCount, 0);
    assert.equal(q.requests[0].status, "approved");
    assert.equal(q.requests[0].reviewerName, "Admin A");
    assert.ok(q.requests[0].reviewedAt);
    const member = (
      await f.db.query("select * from agency_members where user_id=$1", [user])
    ).rows[0];
    assert.equal(member.role, "member");
    assert.equal(member.agency_id, ids.a);
    assert.equal(member.display_name, "Applicant");
    await assert.rejects(
      () => f.review(request.id, "approve"),
      /already reviewed/,
    );
    await assert.rejects(
      () => f.review(request.id, "reject"),
      /already reviewed/,
    );
    await assert.rejects(
      () => f.db.query("update agency_signup_requests set status='pending'"),
      /permission denied/,
    );
    await f.asUser(user);
    assert.equal(
      (await f.db.query("select my_signup_status() as status")).rows[0].status,
      "approved",
    );
  } finally {
    await f.db.close();
  }
});
test("rejection grants no access, direct request reads are protected, and revoked administrators cannot review", async () => {
  const f = await fixture();
  try {
    const user = await f.signup({ confirmed: true });
    await f.asUser(ids.admin);
    const id = (await f.queue()).requests[0].id;
    await f.review(id, "reject");
    assert.equal((await f.queue()).requests[0].status, "rejected");
    await f.asUser(user);
    assert.equal(
      (await f.db.query("select my_signup_status() as status")).rows[0].status,
      "rejected",
    );
    assert.equal(
      (await f.db.query("select * from agency_members")).rows.length,
      0,
    );
    await assert.rejects(
      () => f.db.query("select * from agency_signup_requests"),
      /permission denied/,
    );
    await assert.rejects(
      () => f.db.query("select * from agency_signup_settings"),
      /permission denied/,
    );
    await f.db.exec("reset role");
    await f.db.query(
      "update agency_members set role='member' where user_id=$1",
      [ids.admin],
    );
    await f.asUser(ids.admin);
    await assert.rejects(
      () => f.review(id, "approve"),
      /Administrator permission/,
    );
    await f.db.exec("reset role;set role anon");
    await assert.rejects(() => f.queue(), /permission denied/);
    await assert.rejects(
      () => f.db.query("select my_signup_status()"),
      /permission denied/,
    );
  } finally {
    await f.db.close();
  }
});
test("workspace HTTP authorizes signup notifications and decisions; pending/rejected login is controlled and signs out", async () => {
  const f = await fixture();
  try {
    const user = await f.signup({ confirmed: true });
    await f.asUser(ids.admin);
    const clientFactory = (_url, _key, options) => ({
      auth: {
        getUser: async () =>
          options.global.headers.Authorization === "Bearer valid"
            ? { data: { user: { id: f.current() } }, error: null }
            : { data: { user: null }, error: {} },
      },
      from: (table) => {
        assert.ok(["agency_members", "agencies", "briefs"].includes(table));
        const filters = [];
        const read = async () => {
          const result = await f.db.query(
            "select * from " +
              table +
              (filters.length
                ? " where " +
                  filters.map(([k], i) => k + "=$" + (i + 1)).join(" and ")
                : ""),
            filters.map(([, v]) => v),
          );
          return { data: result.rows, error: null };
        };
        const chain = {
          select: () => chain,
          eq: (key, value) => {
            assert.ok(["user_id", "agency_id", "id"].includes(key));
            filters.push([key, value]);
            return chain;
          },
          order: () => chain,
          maybeSingle: async () => {
            const r = await read();
            return { data: r.data[0] ?? null, error: null };
          },
          single: async () => {
            const r = await read();
            return { data: r.data[0], error: null };
          },
          then: (resolve, reject) => read().then(resolve, reject),
        };
        return chain;
      },
      rpc: async (name, p = {}) => {
        try {
          let sql,
            args = [];
          if (name === "signup_review_queue")
            sql = "select signup_review_queue() as data";
          else if (name === "my_signup_status")
            sql = "select my_signup_status() as data";
          else {
            assert.equal(name, "review_signup_request");
            sql = "select review_signup_request($1,$2) as data";
            args = [p.p_request_id, p.p_decision];
          }
          return {
            data: (await f.db.query(sql, args)).rows[0].data,
            error: null,
          };
        } catch (error) {
          return { data: null, error };
        }
      },
    });
    const handler = createWorkspaceHandler(
      clientFactory,
      (k) =>
        ({
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_ANON_KEY: "public",
        })[k],
    );
    const send = (body, token = "Bearer valid") =>
      handler(
        new Request("http://localhost/workspace", {
          method: "POST",
          headers: { authorization: token, origin: "http://localhost:5173" },
          body: JSON.stringify(body),
        }),
      );
    assert.equal((await send({ action: "signupQueue" }, "")).status, 401);
    assert.equal(
      (await send({ action: "signupQueue" }, "Bearer invalid")).status,
      401,
    );
    let response = await send({ action: "signupQueue" });
    assert.equal(response.status, 200);
    const q = await response.json();
    assert.equal(q.pendingCount, 1);
    await f.asUser(ids.member);
    assert.equal((await send({ action: "signupQueue" })).status, 403);
    await f.asUser(user);
    response = await send({ action: "workspace" });
    assert.equal(response.status, 403);
    assert.equal(
      (await response.json()).error,
      "Your registration is awaiting administrator approval.",
    );
    let logout = 0;
    const api = createWorkspaceApi({
      auth: {
        signInWithPassword: async () => ({ error: null }),
        signOut: async () => {
          logout++;
          return { error: null };
        },
      },
      functions: {
        invoke: async (_endpoint, { body }) => {
          const r = await send(body);
          return r.ok
            ? { data: await r.json(), error: null }
            : { data: null, error: { context: r } };
        },
      },
    });
    await assert.rejects(
      () => api.login("applicant@example.com", "password"),
      /awaiting administrator approval/,
    );
    assert.equal(logout, 1);
    await f.asUser(ids.admin);
    response = await send({
      action: "reviewSignup",
      requestId: q.requests[0].id,
      decision: "reject",
      role: "admin",
    });
    assert.equal(response.status, 200);
    await f.asUser(user);
    response = await send({ action: "workspace" });
    assert.match((await response.json()).error, /declined/);
    const approvedUser = await f.signup({ confirmed: true });
    await f.asUser(ids.admin);
    const pending = (await f.queue()).requests.find(
      (r) => r.status === "pending",
    );
    response = await send({
      action: "reviewSignup",
      requestId: pending.id,
      decision: "approve",
    });
    assert.equal(response.status, 200);
    await f.asUser(approvedUser);
    const workspace = await api.login("approved@example.com", "password");
    assert.equal(workspace.session.role, "member");
    assert.equal(workspace.session.agencyId, ids.a);
    assert.equal(workspace.session.id, approvedUser);
  } finally {
    await f.db.close();
  }
});

test("competing approval decisions persist one membership and one review only", async () => {
  const f = await fixture();
  try {
    const user = await f.signup({ confirmed: true });
    await f.asUser(ids.admin);
    const id = (await f.queue()).requests[0].id;
    const results = await Promise.allSettled([
      f.review(id, "approve"),
      f.review(id, "approve"),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.match(
      results.find((r) => r.status === "rejected").reason.message,
      /already reviewed/,
    );
    assert.equal(
      (
        await f.db.query(
          "select count(*)::int as n from agency_members where user_id=$1",
          [user],
        )
      ).rows[0].n,
      1,
    );
    assert.equal((await f.queue()).requests[0].status, "approved");
  } finally {
    await f.db.close();
  }
});
