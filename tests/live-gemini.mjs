import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { generateStructured } from "../supabase/functions/_shared/gemini.ts";
import {
  conceptsSchema,
  proposalDataSchema,
} from "../supabase/functions/_shared/planning.ts";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey)
  throw new Error("Set GEMINI_API_KEY in a server-only environment file.");
const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const brief = {
  title: "EventFlow Sprint 3 acceptance workshop",
  client: "EventFlow Course Team",
  eventType: "Workshop",
  date: "2026-11-28",
  venue: "Ho Chi Minh City training hall",
  attendees: 80,
  budget: 100000000,
  objectives:
    "Showcase the AI event concept and proposal workflow with practical participant activities.",
  audience: "Event agency planners and project reviewers",
  constraints:
    "Indoor venue, accessible entry, vegetarian meal options; suppliers not yet confirmed.",
};
const startedAt = new Date().toISOString();
const concepts = await generateStructured(
  conceptsSchema,
  {
    task: "Generate 2–3 distinct event concepts with themes, activities and explicit assumptions.",
    brief,
  },
  { apiKey, model },
);
assert.ok(concepts.concepts.length >= 2 && concepts.concepts.length <= 3);
console.log(
  "PASS: live Gemini generated " +
    concepts.concepts.length +
    " valid concepts.",
);
const proposal = await generateStructured(
  proposalDataSchema,
  {
    task: "Create a proposal with objectives, audience, theme, agenda and preliminary assumptions.",
    brief,
    concept: concepts.concepts[0],
  },
  { apiKey, model },
);
console.log("PASS: live Gemini generated all six valid proposal sections.");
const evidence = {
  startedAt,
  completedAt: new Date().toISOString(),
  provider: "Gemini",
  model,
  fixture: "Public synthetic event; no real client data",
  brief,
  concepts: concepts.concepts,
  selectedIndex: 0,
  proposal,
};
assert.ok(!JSON.stringify(evidence).includes(apiKey));
await mkdir(new URL("../docs/previews/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../docs/previews/sprint3-live-gemini.json", import.meta.url),
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(
  "PASS: saved key-free evidence to docs/previews/sprint3-live-gemini.json",
);
