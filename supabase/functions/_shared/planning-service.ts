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
import {
  proposalVenueContext,
  proposalLocationMatches,
} from "./proposal-context.ts";
import { GenerationError } from "./gemini.ts";
import { englishPlanningText } from "./english.ts";
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
    unit:
      v.price.max === null
        ? "provisional allocation"
        : venueUnitLabels[v.price.unit],
    unitCost: v.price.max ?? fallback,
    notes: (
      (v.price.kind === "reference"
        ? "Search reference price; confirmation required. "
        : v.price.kind === "estimate"
          ? "AI estimate; no supplier quote yet. "
          : "Retain provisional allocation; contact the venue for a quote. ") +
      englishPlanningText(v.price.notes)
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
    const previous = proposalVenueContext(brief, state);
    return {
      selectedVenue,
      ...(current
        ? {
            data: applyVenue(
              {
                ...state.proposal!.data,
                locationContext: state.proposal!.data.locationContext ?? {
                  source: previous.source,
                  location: previous.location,
                  selectedVenueId: previous.selectedVenueId,
                  briefVersion: brief.version,
                },
              },
              selectedVenue,
              brief.data,
            ),
          }
        : {}),
    };
  }
  if (req.action === "generateConcepts") {
    if (state.concepts.length && !req.confirm)
      throw new PlanningError(
        "Confirm replacing existing concepts. Saved proposal versions will be preserved.",
      );
    const context = proposalVenueContext(brief, state);
    const result = await generate(conceptsSchema, {
      task: "Generate 2–3 distinct event concepts with themes, 3–5 activities and 2–4 explicit assumptions each. Keep each field concise, no more than 60 words per string. Respect the supplied location and any selected venue's facilities, capacity and conditions. Do not substitute another venue. Unknown facilities and availability must remain assumptions.",
      brief: { ...brief.data, venue: context.location },
      outputLanguage: "English",
      selectedVenue: context.venue,
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
    const context = proposalVenueContext(brief, state);
    if (context.selectionRequired)
      throw new PlanningError(
        "Choose a venue from the search results before generating a proposal.",
      );
    if (state.proposal && !req.confirm)
      throw new PlanningError(
        "Confirm regeneration before replacing the saved proposal.",
      );
    const venue = context.venue;
    const raw = await generate(generatedProposalSchema, {
      task: "Create an editable draft event proposal. Use a short title, objectives, audience, theme, a timed agenda of 5–8 lines, and preliminary assumptions. Keep each prose section under 80 words. Include an estimated VND budget with 9–15 relevant lines covering venue, catering, production/AV, decoration, staffing, marketing, transport, permits/safety/insurance and other costs. Each line needs category, short description, positive integer quantity, unit, nonnegative integer unitCost and notes under 20 words. Include contingencyPercent (0–50), taxPercent (0–100), currency VND and budget assumptions under 80 words. Budget subtotal must not exceed 1 trillion VND. The application computes totals. Respect the brief budget where feasible; disclose shortfalls, unknown tax and unverified prices. Do not invent supplier quotes or double-count bundled venue services.",
      locationRequirements:
        "Use only the supplied brief.venue as the event location. The user-selected search venue takes precedence over the original search area. When no search venue is selected, the brief location is user-provided: retain it exactly, do not recommend or substitute alternatives. Build the theme, timed agenda, activities, logistics and budget around the selected concept and this location together. Keep the selected concept identity and intended experience, but rewrite any venue-specific wording or activities that conflict with the current location. Do not carry over previous venue names. Adapt concept activities to known venue conditions; disclose unknown facilities/capacity and never invent bookings, supplier quotes or availability.",
      brief: { ...brief.data, venue: context.location },
      concept: selected,
      outputLanguage: "English",
      selectedVenue: venue,
    });
    const data = venue
      ? applyVenue(raw, venue, brief.data)
      : proposalDataSchema.parse(raw);
    const locationHeading = `Location: ${context.location}\n`;
    if ((locationHeading + data.agenda).length > 5000)
      throw new GenerationError(
        "The generated agenda is too long. Please regenerate a more concise proposal.",
      );
    if (!venue && data.budget) {
      const items = data.budget.items.filter(
        (item) => item.category === "venue",
      );
      for (const item of items) {
        item.description = context.location.slice(0, 300);
        item.notes = (
          "User-provided location; cost is an estimate pending venue confirmation. " +
          item.notes
        ).slice(0, 1000);
      }
      if (!items.length) {
        if (data.budget.items.length >= 40)
          throw new GenerationError(
            "The generated budget has no room for the specified venue. Please regenerate the proposal.",
          );
        data.budget.items.unshift({
          category: "venue",
          description: context.location.slice(0, 300),
          quantity: 1,
          unit: "event",
          unitCost: 0,
          notes:
            "Venue cost unknown; obtain a quote. Zero is a placeholder, not free rental.",
        });
      }
    }
    return {
      data: proposalDataSchema.parse({
        ...data,
        agenda: locationHeading + data.agenda,
        locationContext: {
          source: context.source,
          location: context.location,
          selectedVenueId: context.selectedVenueId,
          briefVersion: brief.version,
        },
      }),
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
  if (
    !proposalLocationMatches(
      state.proposal.data.locationContext,
      proposalVenueContext(brief, state),
    )
  )
    throw new PlanningError(
      "The venue changed. Regenerate the proposal to align its content with the chosen location and concept.",
    );
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
      locationContext: state.proposal.data.locationContext,
      ...(venue ? { venue } : {}),
      ...(!venue ? { venue: undefined } : {}),
    },
  };
}
