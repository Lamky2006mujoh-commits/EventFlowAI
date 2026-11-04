import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createWorkspaceApi } from "../src/lib/workspace-api.ts";
import {
  planningSchema,
  proposalText,
} from "../supabase/functions/_shared/planning.ts";
const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const projectRef = process.env.EVENTFLOW_LIVE_PROJECT_REF;
if (
  !url ||
  !publicKey ||
  !secret ||
  !projectRef ||
  new URL(url).hostname !== projectRef + ".supabase.co"
)
  throw new Error(
    "Provide matching live project URL/ref and server-only Supabase credentials.",
  );
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const userClient = () => createClient(url, publicKey, options);
const checked = async (promise) => {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
};
const evidence = {
  projectRef,
  startedAt: new Date().toISOString(),
  checks: [],
};
const pass = (message) => {
  evidence.checks.push(message);
  console.log("PASS: " + message);
};
const credentialsUrl = new URL("../.env.acceptance.local", import.meta.url);
let saved = {};
try {
  saved = parseEnv(await readFile(credentialsUrl, "utf8"));
} catch {}
let ownerId, agencyId, ownerEmail, ownerPassword;
if (
  saved.LIVE_SUPABASE_URL === url &&
  saved.LIVE_ADMIN_EMAIL &&
  saved.LIVE_ADMIN_PASSWORD
) {
  ownerEmail = saved.LIVE_ADMIN_EMAIL;
  ownerPassword = saved.LIVE_ADMIN_PASSWORD;
  const existing = userClient();
  const auth = await checked(
    existing.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword,
    }),
  );
  ownerId = auth.user.id;
  const row = await checked(
    admin
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", ownerId)
      .single(),
  );
  agencyId = row.agency_id;
} else {
  ownerEmail = "eventflow.sprint3.admin." + Date.now() + "@example.invalid";
  ownerPassword = randomBytes(24).toString("base64url");
  const created = await checked(
    admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { display_name: "EventFlow Admin" },
    }),
  );
  ownerId = created.user.id;
  const agency = await checked(
    admin
      .from("agencies")
      .insert({ name: "EventFlow Agency" })
      .select("id")
      .single(),
  );
  agencyId = agency.id;
  await checked(
    admin
      .from("agency_members")
      .insert({
        user_id: ownerId,
        agency_id: agencyId,
        display_name: "EventFlow Admin",
        role: "admin",
      }),
  );
}
const saveCredentials = async (briefId) =>
  writeFile(
    credentialsUrl,
    [
      "# Local review account on the new EventFlow project. Keep this file private.",
      "LIVE_SUPABASE_URL=" + url,
      "LIVE_SUPABASE_PUBLISHABLE_KEY=" + publicKey,
      "LIVE_ADMIN_EMAIL=" + ownerEmail,
      "LIVE_ADMIN_PASSWORD=" + ownerPassword,
      "LIVE_BRIEF_ID=" + (briefId ?? ""),
    ].join("\n") + "\n",
  );
await saveCredentials(saved.LIVE_BRIEF_ID);
const temporaryUsers = [];
let otherAgencyId;
try {
  const temporary = async (label) => {
    const password = randomBytes(24).toString("base64url");
    const email =
      "eventflow.sprint3." + label + "." + Date.now() + "@example.invalid";
    const result = await checked(
      admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Test " + label },
      }),
    );
    temporaryUsers.push(result.user.id);
    return { id: result.user.id, email, password };
  };
  const member = await temporary("member");
  const outsider = await temporary("outsider");
  otherAgencyId = (
    await checked(
      admin
        .from("agencies")
        .insert({ name: "Sprint 3 temporary isolation agency" })
        .select("id")
        .single(),
    )
  ).id;
  await checked(
    admin.from("agency_members").insert([
      {
        user_id: member.id,
        agency_id: agencyId,
        display_name: "Test Member",
        role: "member",
      },
      {
        user_id: outsider.id,
        agency_id: otherAgencyId,
        display_name: "Test Outsider",
        role: "admin",
      },
    ]),
  );
  const client = userClient(),
    api = createWorkspaceApi(client);
  const workspace = await api.login(ownerEmail, ownerPassword);
  assert.equal(workspace.session.role, "admin");
  pass(
    "Real password login loads agency workspace with server-derived admin role",
  );
  const brief = {
    title: "Sprint 3 live acceptance workshop",
    client: "EventFlow Review Team",
    eventType: "Workshop",
    date: "2026-11-28",
    venue: "Ho Chi Minh City training hall",
    attendees: 80,
    budget: 100000000,
    objectives:
      "Demonstrate an AI-assisted event planning workflow with practical participant activities.",
    audience: "Event planners and project reviewers",
    constraints:
      "Indoor venue, accessible entry, vegetarian meal options; suppliers are not confirmed.",
  };
  const briefId = await api.save(brief);
  await saveCredentials(briefId);
  evidence.briefId = briefId;
  pass("Saved client brief on live Supabase");
  let state = await api.planning({ action: "load", briefId });
  const command = (action, extra = {}) => ({
    action,
    briefId,
    briefVersion: 1,
    expectedRevision: state.revision,
    ...extra,
  });
  state = await api.planning(command("generateConcepts"));
  assert.ok(state.concepts.length >= 2 && state.concepts.length <= 3);
  evidence.conceptTitles = state.concepts.map((c) => c.title);
  pass(
    "Deployed Edge Function generated and persisted 2–3 real Gemini concepts",
  );
  state = await api.planning(
    command("select", { conceptId: state.concepts[0].id }),
  );
  assert.equal(state.selectedId, state.concepts[0].id);
  pass("Concept selection persisted");
  state = await api.planning(command("generateProposal"));
  assert.equal(state.proposal.version, 1);
  assert.equal(state.proposal.status, "Draft");
  pass("Deployed Edge Function generated and saved real Gemini proposal");
  const original = structuredClone(state.proposal.data);
  const previousRevision = state.revision;
  state = await api.planning(
    command("saveProposal", {
      data: { ...original, theme: "Human-reviewed: " + original.theme },
    }),
  );
  assert.equal(state.proposal.version, 2);
  assert.deepEqual(state.history[0].data, original);
  assert.equal(state.proposal.author, "EventFlow Admin");
  pass("Manual proposal edits saved as v2; v1 and server author preserved");
  await assert.rejects(
    () => api.planning(command("generateProposal", { confirm: false })),
    /Confirm regeneration/,
  );
  pass("Unconfirmed regeneration cannot overwrite manual proposal");
  await assert.rejects(
    () =>
      api.planning({
        ...command("saveProposal", { data: original }),
        expectedRevision: previousRevision,
      }),
    /conflict/,
  );
  pass("Stale planning write rejected");
  const reloaded = planningSchema.parse(
    await api.planning({ action: "load", briefId }),
  );
  assert.equal(reloaded.proposal.version, 2);
  assert.match(proposalText(reloaded.proposal), /Human-reviewed:/);
  assert.match(proposalText(reloaded.proposal), /Status: Draft/);
  pass("Reload and export retain latest saved content and Draft status");
  const foreignClient = userClient(),
    foreignApi = createWorkspaceApi(foreignClient);
  await foreignApi.login(outsider.email, outsider.password);
  const invisible = await checked(
    foreignClient.from("briefs").select("id").eq("id", briefId),
  );
  assert.equal(invisible.length, 0);
  const planningInvisible = await checked(
    foreignClient
      .from("brief_planning")
      .select("brief_id")
      .eq("brief_id", briefId),
  );
  assert.equal(planningInvisible.length, 0);
  await assert.rejects(
    () => foreignApi.planning({ action: "load", briefId }),
    /not found in your agency/,
  );
  await assert.rejects(
    () =>
      foreignApi.planning({
        ...command("select"),
        conceptId: state.concepts[0].id,
      }),
    /not found in your agency/,
  );
  pass(
    "Other agency cannot read or mutate briefs/planning through RLS and Edge Function",
  );
  const memberClient = userClient(),
    memberApi = createWorkspaceApi(memberClient);
  await memberApi.login(member.email, member.password);
  assert.equal(
    (await memberApi.planning({ action: "load", briefId })).revision,
    state.revision,
  );
  await checked(admin.from("agency_members").delete().eq("user_id", member.id));
  await assert.rejects(
    () => memberApi.planning({ action: "load", briefId }),
    /no agency access/,
  );
  pass("Removed membership immediately revokes planning access");
  const anonymous = await fetch(url + "/functions/v1/planning", {
    method: "POST",
    headers: { apikey: publicKey, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "load", briefId }),
  });
  assert.equal(anonymous.status, 401);
  pass("Planning endpoint denies missing authenticated JWT");
  evidence.proposalVersion = state.proposal.version;
  evidence.completedAt = new Date().toISOString();
  evidence.status = "passed";
  await mkdir(new URL("../docs/previews/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL("../docs/previews/sprint3-live-supabase.json", import.meta.url),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(
    "Saved key-free evidence; review account credentials are in ignored .env.acceptance.local",
  );
} finally {
  for (const id of temporaryUsers)
    await checked(admin.auth.admin.deleteUser(id));
  if (otherAgencyId)
    await checked(admin.from("agencies").delete().eq("id", otherAgencyId));
  console.log(
    "Temporary isolation accounts and agency removed. The review admin and acceptance brief remain available.",
  );
}
