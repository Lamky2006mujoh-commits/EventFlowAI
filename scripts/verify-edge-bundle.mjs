import { PGlite } from "@electric-sql/pglite";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const db = new PGlite();
try {
  await db.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
  );
  await db.exec(
    await readFile(
      new URL("../dist-edge/bootstrap-new-project.sql", import.meta.url),
      "utf8",
    ),
  );
  const expected = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  ).filter((p) => p.endsWith(".sql")).length;
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from supabase_migrations.schema_migrations",
      )
    ).rows[0].count,
    expected,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from pg_tables where schemaname='public' and tablename in ('agencies','agency_members','briefs','brief_versions','brief_planning') and rowsecurity",
      )
    ).rows[0].count,
    5,
  );
  await db.exec("set role anon");
  await assert.rejects(
    () => db.query("select * from public.brief_planning"),
    /permission denied/,
  );
  console.log(
    "PASS: packaged bootstrap creates all protected tables and records " +
      expected +
      " migrations; anonymous planning read denied.",
  );
} finally {
  await db.close();
}
