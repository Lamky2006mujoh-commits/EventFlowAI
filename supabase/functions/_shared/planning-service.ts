import {
  conceptsSchema,
  proposalDataSchema,
  planningRequestSchema,
  type Planning,
  type PlanningRequest,
} from "./planning.ts";
import type { BriefData } from "./contracts.ts";
export class PlanningError extends Error {
  status = 409;
}
export async function preparePlanning(
  input: PlanningRequest,
  state: Planning,
  brief: { version: number; data: BriefData },
  generate: <T>(
    schema: import("zod").z.ZodType<T>,
    input: unknown,
  ) => Promise<T>,
) {
  const req = planningRequestSchema.parse(input);
  if (req.action === "load") return null;
  if (
    req.expectedRevision !== state.revision ||
    req.briefVersion !== brief.version
  )
    throw new PlanningError(
      "Planning or brief version conflict. Reload before saving.",
    );
  if (req.action === "generateConcepts") {
    if (state.concepts.length && !req.confirm)
      throw new PlanningError(
        "Confirm replacing existing concepts. Saved proposal versions will be preserved.",
      );
    const result = await generate(conceptsSchema, {
      task: "Generate 2–3 distinct event concepts with themes, 3–5 activities and 2–4 explicit assumptions each. Keep each field concise, no more than 60 words per string.",
      brief: brief.data,
    });
    return {
      concepts: result.concepts.map((c) => ({ ...c, id: crypto.randomUUID() })),
    };
  }
  if (state.briefVersion !== brief.version)
    throw new PlanningError(
      "The brief changed. Generate concepts for the latest brief first.",
    );
  if (req.action === "select") {
    if (!state.concepts.some((c) => c.id === req.conceptId))
      throw new PlanningError("Concept not found in this brief.");
    return { conceptId: req.conceptId };
  }
  const selected = state.concepts.find((c) => c.id === state.selectedId);
  if (!selected)
    throw new PlanningError("Select a concept before generating a proposal.");
  if (req.action === "generateProposal") {
    if (state.proposal && !req.confirm)
      throw new PlanningError(
        "Confirm regeneration before replacing the saved proposal.",
      );
    const data = await generate(proposalDataSchema, {
      task: "Create a concise proposal with objectives, audience, theme, a timed agenda of 5–8 items and preliminary assumptions. Keep each section under 250 words.",
      brief: brief.data,
      concept: selected,
    });
    return { data };
  }
  if (
    !state.proposal ||
    state.proposal.conceptId !== state.selectedId ||
    state.proposal.briefVersion !== brief.version
  )
    throw new PlanningError(
      "Generate a proposal for the selected concept and current brief first.",
    );
  return { data: proposalDataSchema.parse(req.data) };
}
