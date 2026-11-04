import {
  conceptsSchema,
  generatedProposalSchema,
  proposalDataSchema,
  planningRequestSchema,
  type Planning,
  type PlanningRequest,
  type ProposalData,
} from "./planning.ts";
import { baselineBudget, budgetSchema } from "./budget.ts";
import {
  venueUnitLabels,
  type VenueSearch,
  type SelectedVenue,
} from "./venues.ts";
import type { BriefData } from "./contracts.ts";
export class PlanningError extends Error {
  status = 409;
}
export function applyVenue(
  data: ProposalData,
  selected: SelectedVenue,
  brief: BriefData,
): ProposalData {
  const budget = structuredClone(
    data.budget ?? baselineBudget(brief.budget, brief.attendees),
  );
  const v = selected.venue,
    existing = budget.items.findIndex((i) => i.category === "venue");
  const fallback =
    existing >= 0
      ? budget.items[existing].quantity * budget.items[existing].unitCost
      : Math.floor(brief.budget * 0.25);
  const item = {
    category: "venue" as const,
    description: v.name.slice(0, 300),
    quantity: v.price.max === null ? 1 : selected.quantity,
    unit: v.price.max === null ? "khoản dự trù" : venueUnitLabels[v.price.unit],
    unitCost: v.price.max ?? fallback,
    notes: (
      (v.price.kind === "reference"
        ? "Giá tham khảo từ tìm kiếm, cần xác nhận. "
        : v.price.kind === "estimate"
          ? "Ước tính AI, chưa có báo giá. "
          : "Giữ khoản dự trù; cần liên hệ để lấy báo giá. ") + v.price.notes
    ).slice(0, 1000),
  };
  if (existing >= 0) budget.items[existing] = item;
  else budget.items.unshift(item);
  return { ...data, budget: budgetSchema.parse(budget), venue: selected };
}
export type PlanningPayload = {
  concepts?: Planning["concepts"];
  conceptId?: string;
  data?: ProposalData;
  venueSearch?: VenueSearch;
  selectedVenue?: SelectedVenue;
};
export async function preparePlanning(
  input: PlanningRequest,
  state: Planning,
  brief: { version: number; data: BriefData },
  generate: <T>(
    schema: import("zod").z.ZodType<T>,
    input: unknown,
  ) => Promise<T>,
  findVenues?: (
    brief: { version: number; data: BriefData },
    preferences: string,
  ) => Promise<VenueSearch>,
): Promise<PlanningPayload | null> {
  const req = planningRequestSchema.parse(input);
  if (req.action === "load") return null;
  if (
    req.expectedRevision !== state.revision ||
    req.briefVersion !== brief.version
  )
    throw new PlanningError(
      "Planning or brief version conflict. Reload before saving.",
    );
  if (req.action === "searchVenues") {
    if (!findVenues)
      throw new PlanningError(
        "Venue search is unavailable. Please retry later.",
      );
    return { venueSearch: await findVenues(brief, req.preferences) };
  }
  if (req.action === "selectVenue") {
    if (state.venueSearch?.briefVersion !== brief.version)
      throw new PlanningError(
        "The brief changed. Search venues for the current brief first.",
      );
    const venue = state.venueSearch.options.find((v) => v.id === req.venueId);
    if (!venue)
      throw new PlanningError("Venue not found in the current search.");
    const selectedVenue: SelectedVenue = {
      venue,
      quantity: req.quantity,
      briefVersion: brief.version,
      selectedAt: new Date().toISOString(),
    };
    const current =
      state.proposal &&
      state.proposal.briefVersion === brief.version &&
      state.proposal.conceptId === state.selectedId;
    return {
      selectedVenue,
      ...(current
        ? { data: applyVenue(state.proposal!.data, selectedVenue, brief.data) }
        : {}),
    };
  }
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
    const venue =
      state.selectedVenue?.briefVersion === brief.version
        ? state.selectedVenue
        : null;
    const raw = await generate(generatedProposalSchema, {
      task: "Create a concise event proposal with objectives, audience, theme, a timed agenda of 5–8 items, preliminary assumptions, AND a detailed estimated VND budget. Allocate venue, catering, stage/AV, decoration, staffing, marketing, transport, permits/safety/insurance and other relevant items. Include quantities, units, integer unit costs, contingency percent, tax percent and assumptions. Budget totals are calculated by the application, do not put totals into item amounts. Respect the client total budget where feasible; disclose shortfalls rather than inventing supplier quotes. Include every relevant cost, avoid double-counting services bundled in the selected venue, and explicitly mark unknown tax/quotes in notes. Keep prose sections under 250 words.",
      brief: brief.data,
      concept: selected,
      selectedVenue: venue,
    });
    return {
      data: venue
        ? applyVenue(raw, venue, brief.data)
        : proposalDataSchema.parse(raw),
    };
  }
  if (
    !state.proposal ||
    state.proposal.conceptId !== state.selectedId ||
    state.proposal.briefVersion !== brief.version
  )
    throw new PlanningError(
      "Generate a proposal for the selected concept and current brief first.",
    );
  const data = proposalDataSchema.parse(req.data);
  if (!data.budget)
    throw new PlanningError(
      "Add an estimated itemized budget before saving this proposal.",
    );
  // A venue changes only through explicit selection, never through client-edited proposal metadata.
  const venue =
    state.selectedVenue?.briefVersion === brief.version
      ? state.selectedVenue
      : null;
  return {
    data: {
      ...data,
      ...(venue ? { venue } : {}),
      ...(!venue ? { venue: undefined } : {}),
    },
  };
}
