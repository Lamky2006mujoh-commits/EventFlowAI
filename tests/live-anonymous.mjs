// Live, read-only checks. Run with: node --env-file=.env.local tests/live-anonymous.mjs
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.VITE_SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key)
  throw new Error("Configure the Supabase public URL and key first.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: loginError } = await client.auth.signInWithPassword({
  email: "not-a-course-account@example.invalid",
  password: "intentionally-invalid-password",
});
assert.equal(
  loginError?.code,
  "invalid_credentials",
  "Auth must reject credentials explicitly, not merely fail to connect",
);
console.log("PASS: invalid email/password rejected by Supabase Auth");
for (const table of [
  "briefs",
  "brief_versions",
  "brief_planning",
  "agency_members",
  "agencies",
  "agency_signup_settings",
  "agency_signup_requests",
]) {
  const { data, error } = await client.from(table).select("*").limit(1);
  if (error)
    assert.equal(
      error.code,
      "42501",
      `${table}: expected permission denial; network/setup errors are not security evidence`,
    );
  else assert.deepEqual(data, [], `${table} must not expose rows anonymously`);
  console.log(`PASS: anonymous ${table} read denied`);
}
for (const [name, params] of [
  ["signup_review_queue", {}],
  ["my_signup_status", {}],
  [
    "review_signup_request",
    {
      p_request_id: "10000000-0000-4000-8000-000000000001",
      p_decision: "approve",
    },
  ],
]) {
  const { error } = await client.rpc(name, params);
  assert.equal(
    error?.code,
    "42501",
    `${name} must explicitly deny anonymous execution`,
  );
  console.log(`PASS: anonymous ${name} execution denied`);
}
for (const endpoint of ["workspace", "planning"]) {
  for (const authorization of [null, "Bearer invalid-token"]) {
    const headers = { "Content-Type": "application/json", apikey: key };
    if (authorization) headers.Authorization = authorization;
    const response = await fetch(url + "/functions/v1/" + endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(
        endpoint === "workspace"
          ? { action: "workspace" }
          : { action: "load", briefId: "10000000-0000-4000-8000-000000000001" },
      ),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      response.status,
      401,
      "Missing or invalid credentials must be rejected",
    );
    console.log(
      "PASS: " +
        (authorization ? "invalid" : "missing") +
        " bearer token rejected by " +
        endpoint +
        " endpoint",
    );
  }
}
