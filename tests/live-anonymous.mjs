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
assert.ok(loginError, "Invalid credentials must be rejected");
console.log("PASS: invalid email/password rejected by Supabase Auth");
for (const table of [
  "briefs",
  "brief_versions",
  "agency_members",
  "agencies",
]) {
  const { data, error } = await client.from(table).select("*").limit(1);
  assert.ok(
    error || data.length === 0,
    `${table} must not expose rows anonymously`,
  );
  console.log(`PASS: anonymous ${table} read denied`);
}
for (const authorization of [null, "Bearer invalid-token"]) {
  const headers = { "Content-Type": "application/json", apikey: key };
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(`${url}/functions/v1/workspace`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "workspace" }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    401,
    "Missing or invalid credentials must be rejected",
  );
  console.log(
    `PASS: ${authorization ? "invalid" : "missing"} bearer token rejected by workspace endpoint`,
  );
}
