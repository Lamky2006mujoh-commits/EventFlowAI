import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
const migrations = new URL("../supabase/migrations/", import.meta.url);
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for (const f of (await readdir(migrations))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(f, migrations), "utf8"));
  return db;
}
test("Sprint 2 SQL security suite runs against PostgreSQL with all migrations", async () => {
  const db = await database();
  try {
    await db.exec(
      await readFile(
        new URL("./database-security.sql", import.meta.url),
        "utf8",
      ),
    );
  } finally {
    await db.close();
  }
});
test("Sprint 3 PostgreSQL: RLS, atomic versions, validation, confirmation, stale writes, revocation and anon denial", async () => {
  const db = await database();
  try {
    const a = "10000000-0000-4000-8000-000000000001",
      b = "10000000-0000-4000-8000-000000000002";
    const aa = "20000000-0000-4000-8000-000000000001",
      ab = "20000000-0000-4000-8000-000000000002";
    const sample = {
      title: "Database event",
      client: "Client",
      eventType: "Workshop",
      date: "2026-11-28",
      venue: "Hall",
      attendees: 20,
      budget: 10000000,
      objectives: "Verify secure planning",
      audience: "Team",
      constraints: "None confirmed",
    };
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    await db.query("insert into agencies(id,name) values($1,$2),($3,$4)", [
      aa,
      "Agency A",
      ab,
      "Agency B",
    ]);
    await db.query(
      "insert into agency_members(user_id,agency_id,display_name,role) values($1,$2,$3,$4),($5,$6,$7,$8)",
      [a, aa, "Member A", "member", b, ab, "Admin B", "admin"],
    );
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await asUser(a);
    const id = (
      await db.query("select save_brief($1::jsonb) as id", [
        JSON.stringify(sample),
      ])
    ).rows[0].id;
    const call = async (action, revision, version, payload, confirm = false) =>
      (
        await db.query(
          "select save_planning($1,$2,$3,$4,$5::jsonb,$6) as state",
          [id, action, revision, version, JSON.stringify(payload), confirm],
        )
      ).rows[0].state;
    const concepts = [1, 2].map((i) => ({
      id: "30000000-0000-4000-8000-00000000000" + i,
      title: "Concept " + i,
      theme: "Theme",
      activities: ["Activity"],
      assumptions: ["Pending"],
    }));
    await assert.rejects(
      () => call("generateConcepts", 0, 1, { concepts: [] }),
      /Invalid planning data/,
    );
    let s = await call("generateConcepts", 0, 1, { concepts });
    assert.equal(s.revision, 1);
    await assert.rejects(
      () => call("generateConcepts", 1, 1, { concepts }),
      /Confirmation required/,
    );
    await assert.rejects(
      () =>
        call("select", 1, 1, {
          conceptId: "30000000-0000-4000-8000-000000000009",
        }),
      /Concept not found/,
    );
    s = await call("select", 1, 1, { conceptId: concepts[0].id });
    assert.equal(s.selectedId, concepts[0].id);
    const data = {
      title: "Proposal",
      objectives: "Objectives",
      audience: "Team",
      theme: "Theme",
      agenda: "Agenda",
      assumptions: "Pending",
    };
    s = await call("generateProposal", 2, 1, { data });
    assert.equal(s.proposal.version, 1);
    assert.equal(s.proposal.author, "Member A");
    assert.equal(s.proposal.status, "Draft");
    await assert.rejects(
      () => call("generateProposal", 3, 1, { data }),
      /Confirmation required/,
    );
    await assert.rejects(
      () => call("saveProposal", 2, 1, { data }),
      /conflict/,
    );
    await assert.rejects(
      () => call("saveProposal", 3, 1, { data: { ...data, agenda: "" } }),
      /Invalid planning data/,
    );
    s = await call("saveProposal", 3, 1, {
      data: { ...data, theme: "Manual" },
      status: "Approved",
      author: "Fake",
    });
    assert.equal(s.proposal.version, 2);
    assert.equal(s.history[0].data.theme, "Theme");
    assert.equal(s.proposal.status, "Draft");
    assert.equal(s.proposal.author, "Member A");
    // Direct writes cannot bypass the RPC or modify immutable snapshots.
    await assert.rejects(
      () =>
        db.query("update brief_planning set state=$1 where brief_id=$2", [
          JSON.stringify(s),
          id,
        ]),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("delete from brief_planning where brief_id=$1", [id]),
      /permission denied/,
    );
    await asUser(b);
    assert.equal(
      (await db.query("select * from brief_planning")).rows.length,
      0,
    );
    await assert.rejects(
      () => call("select", 4, 1, { conceptId: concepts[0].id }),
      /not found in your agency/,
    );
    await asUser(a);
    await db.query("select save_brief($1::jsonb,$2,1)", [
      JSON.stringify({ ...sample, budget: 20000000 }),
      id,
    ]);
    await assert.rejects(
      () => call("saveProposal", 4, 1, { data }),
      /conflict/,
    );
    await assert.rejects(
      () => call("saveProposal", 4, 2, { data }),
      /Brief changed/,
    );
    s = await call("generateConcepts", 4, 2, { concepts }, true);
    assert.equal(s.history.length, 2);
    assert.equal(s.selectedId, null);
    assert.equal(s.briefVersion, 2);
    // Simulate a generation started before a concurrent source edit: commit must fail.
    await db.query("select save_brief($1::jsonb,$2,2)", [
      JSON.stringify(sample),
      id,
    ]);
    await assert.rejects(
      () => call("generateConcepts", 5, 2, { concepts }, true),
      /conflict/,
    );
    await db.exec("reset role");
    await db.query("delete from agency_members where user_id=$1", [a]);
    await asUser(a);
    assert.equal(
      (await db.query("select * from brief_planning")).rows.length,
      0,
    );
    await assert.rejects(
      () => call("generateConcepts", 5, 3, { concepts }, true),
      /membership required/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      () => db.query("select * from brief_planning"),
      /permission denied/,
    );
    await assert.rejects(
      () => call("generateConcepts", 5, 3, { concepts }, true),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

test("Edge HTTP → Gemini → real PostgreSQL: full workflow, API failure and source-edit race", async () => {
  const { createPlanningHandler } =
    await import("../supabase/functions/_shared/planning-handler.ts");
  const db = await database();
  const originalFetch = globalThis.fetch;
  try {
    const user = "90000000-0000-4000-8000-000000000001",
      agency = "90000000-0000-4000-8000-000000000002";
    const sample = {
      title: "HTTP integrated event",
      client: "Client",
      eventType: "Workshop",
      date: "2026-11-28",
      venue: "Hall",
      attendees: 20,
      budget: 10000000,
      objectives: "Verify integrated Edge workflow",
      audience: "Team",
      constraints: "None confirmed",
    };
    await db.query("insert into auth.users(id) values($1)", [user]);
    await db.query("insert into agencies(id,name) values($1,$2)", [
      agency,
      "HTTP Agency",
    ]);
    await db.query(
      "insert into agency_members(user_id,agency_id,display_name,role) values($1,$2,$3,$4)",
      [user, agency, "HTTP Member", "member"],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec("set role authenticated");
    const id = (
      await db.query("select save_brief($1::jsonb) as id", [
        JSON.stringify(sample),
      ])
    ).rows[0].id;
    const adapter = {
      auth: {
        getUser: async () => ({ data: { user: { id: user } }, error: null }),
      },
      from(table) {
        assert.ok(
          ["agency_members", "briefs", "brief_planning"].includes(table),
        );
        const filters = [];
        const chain = {
          select: () => chain,
          eq: (key, value) => {
            assert.ok(["user_id", "id", "agency_id", "brief_id"].includes(key));
            filters.push([key, value]);
            return chain;
          },
          maybeSingle: async () => {
            try {
              const result = await db.query(
                "select * from " +
                  table +
                  " where " +
                  filters.map(([key], i) => key + "=$" + (i + 1)).join(" and "),
                filters.map(([, v]) => v),
              );
              return { data: result.rows[0] ?? null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };
        return chain;
      },
      rpc: async (name, p) => {
        assert.equal(name, "save_planning");
        try {
          return {
            data: (
              await db.query(
                "select save_planning($1,$2,$3,$4,$5::jsonb,$6) as state",
                [
                  p.p_brief_id,
                  p.p_action,
                  p.p_expected_revision,
                  p.p_brief_version,
                  JSON.stringify(p.p_payload),
                  p.p_confirm,
                ],
              )
            ).rows[0].state,
            error: null,
          };
        } catch (error) {
          return { data: null, error };
        }
      },
    };
    const secrets = {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "public",
      GEMINI_API_KEY: "server-secret-fixture",
      GEMINI_MODEL: "test-model",
    };
    const handler = createPlanningHandler(
      () => adapter,
      (k) => secrets[k],
    );
    const request = async (body) =>
      handler(
        new Request("http://localhost/planning", {
          method: "POST",
          headers: {
            authorization: "Bearer jwt",
            origin: "http://localhost:5174",
          },
          body: JSON.stringify({ ...body, briefId: id }),
        }),
      );
    let providerCalls = 0;
    const concepts = {
      concepts: [1, 2].map((i) => ({
        title: "Concept " + i,
        theme: "Theme",
        activities: ["Welcome"],
        assumptions: ["Venue pending"],
      })),
    };
    const proposal = {
      title: "Proposal",
      objectives: "Objectives",
      audience: "Team",
      theme: "Theme",
      agenda: "Welcome",
      assumptions: "Pending",
    };
    const response = (value) =>
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
    globalThis.fetch = async (url, init) => {
      assert.ok(
        String(url).startsWith("https://generativelanguage.googleapis.com/"),
      );
      assert.equal(init.headers["x-goog-api-key"], secrets.GEMINI_API_KEY);
      providerCalls++;
      if (providerCalls === 1) return new Response("", { status: 503 });
      return response(providerCalls === 2 ? concepts : proposal);
    };
    let result = await request({
      action: "generateConcepts",
      expectedRevision: 0,
      briefVersion: 1,
    });
    assert.equal(result.status, 200);
    assert.equal(
      result.headers.get("access-control-allow-origin"),
      "http://localhost:5174",
    );
    let s = await result.json();
    assert.equal(s.concepts.length, 2);
    assert.equal(providerCalls, 2);
    assert.ok(!JSON.stringify(s).includes(secrets.GEMINI_API_KEY));
    result = await request({
      action: "select",
      conceptId: s.concepts[0].id,
      expectedRevision: s.revision,
      briefVersion: 1,
    });
    assert.equal(result.status, 200);
    s = await result.json();
    result = await request({
      action: "generateProposal",
      expectedRevision: s.revision,
      briefVersion: 1,
    });
    assert.equal(result.status, 200);
    s = await result.json();
    assert.equal(s.proposal.version, 1);
    result = await request({
      action: "saveProposal",
      data: { ...proposal, theme: "Manual HTTP edit" },
      expectedRevision: s.revision,
      briefVersion: 1,
    });
    assert.equal(result.status, 200);
    s = await result.json();
    assert.equal(s.history.length, 2);
    globalThis.fetch = async () =>
      new Response("server-secret-fixture", { status: 403 });
    result = await request({
      action: "generateProposal",
      confirm: true,
      expectedRevision: s.revision,
      briefVersion: 1,
    });
    assert.equal(result.status, 502);
    assert.ok(!(await result.text()).includes(secrets.GEMINI_API_KEY));
    const saved = (
      await db.query("select state from brief_planning where brief_id=$1", [id])
    ).rows[0].state;
    assert.equal(saved.revision, s.revision);
    assert.equal(saved.proposal.data.theme, "Manual HTTP edit");
    globalThis.fetch = async () => {
      await db.query("select save_brief($1::jsonb,$2,1)", [
        JSON.stringify({ ...sample, budget: 999 }),
        id,
      ]);
      return response(proposal);
    };
    result = await request({
      action: "generateProposal",
      confirm: true,
      expectedRevision: s.revision,
      briefVersion: 1,
    });
    assert.equal(result.status, 409);
    assert.equal(
      (
        await db.query("select state from brief_planning where brief_id=$1", [
          id,
        ])
      ).rows[0].state.history.length,
      2,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await db.close();
  }
});
