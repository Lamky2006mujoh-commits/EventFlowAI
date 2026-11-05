import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { demo, demoPeople } from "../src/lib/demo.ts";
import { preparePlanning } from "../supabase/functions/_shared/planning-service.ts";
import { baselineBudget } from "../supabase/functions/_shared/budget.ts";
import { proposalText } from "../supabase/functions/_shared/planning.ts";

class Storage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}
beforeEach(() => {
  globalThis.localStorage = new Storage();
  globalThis.sessionStorage = new Storage();
});
const command = (brief, state, action, extra = {}) => ({
  action,
  briefId: brief.id,
  briefVersion: brief.version,
  expectedRevision: state.revision,
  ...extra,
});
async function fixture(search = false) {
  const brief = demo.login(demoPeople[0].id).briefs[0];
  let state = await demo.planning({ action: "load", briefId: brief.id });
  if (search)
    state = await demo.planning(command(brief, state, "searchVenues"));
  state = await demo.planning(command(brief, state, "generateConcepts"));
  state = await demo.planning(
    command(brief, state, "select", { conceptId: state.concepts[1].id }),
  );
  return { brief, state };
}
const generated = (brief) => ({
  title: "Event proposal",
  objectives: brief.data.objectives,
  audience: "Planners",
  theme: "Selected concept theme",
  agenda: "09:00 Welcome\n10:00 Workshop",
  assumptions: "Supplier quotes and facilities require confirmation.",
  budget: baselineBudget(brief.data.budget, brief.data.attendees),
});

test("starting venue search requires an explicit venue choice before paid proposal generation", async () => {
  const { brief, state } = await fixture(true);
  let calls = 0;
  await assert.rejects(
    () =>
      preparePlanning(
        command(brief, state, "generateProposal"),
        state,
        brief,
        async () => {
          calls++;
          throw new Error("Must not invoke provider");
        },
      ),
    /Choose a venue from the search results/,
  );
  assert.equal(calls, 0);
});

test("selected search venue overrides the brief search area and is combined with the selected concept", async () => {
  const { brief, state: initial } = await fixture(true);
  const state = await demo.planning(
    command(brief, initial, "selectVenue", {
      venueId: initial.venueSearch.options[1].id,
      quantity: 2,
    }),
  );
  const venue = state.selectedVenue.venue;
  let input;
  const payload = await preparePlanning(
    command(brief, state, "generateProposal"),
    state,
    brief,
    async (schema, request) => {
      input = request;
      return schema.parse(generated(brief));
    },
  );
  assert.equal(input.brief.venue, `${venue.name}, ${venue.address}`);
  assert.equal(input.concept.id, state.selectedId);
  assert.equal(input.selectedVenue.venue.id, venue.id);
  assert.match(input.locationRequirements, /takes precedence/);
  assert.equal(payload.data.locationContext.source, "selected");
  assert.equal(payload.data.locationContext.selectedVenueId, venue.id);
  assert.ok(
    payload.data.agenda.startsWith(
      `Location: ${venue.name}, ${venue.address}\n`,
    ),
  );
  assert.equal(
    payload.data.budget.items.find((i) => i.category === "venue").description,
    venue.name,
  );
});

test("an exact user-provided location stays exact with no search or invented venue metadata", async () => {
  const { brief: initial, state } = await fixture();
  const exact = "Private Lotus Hall, 27 Example Street, District 3";
  const brief = { ...initial, data: { ...initial.data, venue: exact } };
  let input;
  const payload = await preparePlanning(
    command(brief, state, "generateProposal"),
    state,
    brief,
    async (schema, request) => {
      input = request;
      return schema.parse(generated(brief));
    },
    async () => {
      throw new Error("Exact location must not invoke search");
    },
  );
  assert.equal(input.brief.venue, exact);
  assert.equal(input.concept.id, state.selectedId);
  assert.equal(input.selectedVenue, null);
  assert.match(input.locationRequirements, /retain it exactly/);
  assert.equal(payload.data.locationContext.source, "brief");
  assert.equal(payload.data.locationContext.location, exact);
  assert.equal(payload.data.venue, undefined);
  assert.ok(payload.data.agenda.startsWith(`Location: ${exact}\n`));
  assert.equal(
    payload.data.budget.items.find((i) => i.category === "venue").description,
    exact,
  );
  assert.match(
    payload.data.budget.items.find((i) => i.category === "venue").notes,
    /estimate pending/,
  );
});

test("venue changes require regeneration; new narrative follows the chosen venue while old versions survive", async () => {
  const { brief, state: initial } = await fixture(true);
  let state = await demo.planning(
    command(brief, initial, "selectVenue", {
      venueId: initial.venueSearch.options[0].id,
      quantity: 1,
    }),
  );
  state = await demo.planning(command(brief, state, "generateProposal"));
  const first = structuredClone(state.proposal);
  state = await demo.planning(
    command(brief, state, "selectVenue", {
      venueId: initial.venueSearch.options[1].id,
      quantity: 1,
    }),
  );
  assert.match(proposalText(state.proposal), /LOCATION REVIEW REQUIRED/);
  await assert.rejects(
    () =>
      demo.planning(
        command(brief, state, "saveProposal", {
          data: {
            ...state.proposal.data,
            locationContext: {
              ...state.proposal.data.locationContext,
              selectedVenueId: state.selectedVenue.venue.id,
            },
          },
        }),
      ),
    /venue changed.*Regenerate/,
  );
  state = await demo.planning(
    command(brief, state, "generateProposal", { confirm: true }),
  );
  assert.equal(
    state.proposal.data.locationContext.selectedVenueId,
    state.selectedVenue.venue.id,
  );
  assert.ok(
    state.proposal.data.agenda.includes(state.selectedVenue.venue.name),
  );
  assert.deepEqual(state.history[0], first);
  const exported = proposalText(state.proposal);
  assert.ok(exported.includes(state.selectedVenue.venue.name));
  assert.ok(!exported.includes("[object Object]"));
  assert.ok(!exported.includes("LOCATION REVIEW REQUIRED"));
});

test("stale venue selections cannot override a newer exact location", async () => {
  const { brief: initial, state: before } = await fixture(true);
  const chosen = await demo.planning(
    command(initial, before, "selectVenue", {
      venueId: before.venueSearch.options[0].id,
      quantity: 1,
    }),
  );
  const brief = {
    ...initial,
    version: 2,
    data: { ...initial.data, venue: "Exact new venue" },
  };
  const state = { ...chosen, briefVersion: 2 };
  let input;
  await preparePlanning(
    command(brief, state, "generateProposal"),
    state,
    brief,
    async (schema, request) => {
      input = request;
      return schema.parse(generated(brief));
    },
  );
  assert.equal(input.brief.venue, "Exact new venue");
  assert.equal(input.selectedVenue, null);
});

test("concept generation also receives the selected venue rather than the original brief location", async () => {
  const { brief, state: initial } = await fixture(true);
  const state = await demo.planning(
    command(brief, initial, "selectVenue", {
      venueId: initial.venueSearch.options[0].id,
      quantity: 1,
    }),
  );
  let input;
  await preparePlanning(
    command(brief, state, "generateConcepts", { confirm: true }),
    state,
    brief,
    async (schema, request) => {
      input = request;
      return schema.parse({
        concepts: state.concepts.map(({ id: _id, ...concept }) => concept),
      });
    },
  );
  assert.equal(
    input.brief.venue,
    state.selectedVenue.venue.name + ", " + state.selectedVenue.venue.address,
  );
  assert.equal(input.selectedVenue.venue.id, state.selectedVenue.venue.id);
});

test("selecting a new venue for a legacy proposal records its previous location for review", async () => {
  const { brief, state: initial } = await fixture(true);
  let state = await demo.planning(
    command(brief, initial, "selectVenue", {
      venueId: initial.venueSearch.options[0].id,
      quantity: 1,
    }),
  );
  state = await demo.planning(command(brief, state, "generateProposal"));
  const legacy = structuredClone(state);
  delete legacy.proposal.data.locationContext;
  const payload = await preparePlanning(
    command(brief, legacy, "selectVenue", {
      venueId: initial.venueSearch.options[1].id,
      quantity: 1,
    }),
    legacy,
    brief,
    async () => {
      throw new Error("Selection must not call AI");
    },
  );
  assert.equal(
    payload.data.locationContext.selectedVenueId,
    state.selectedVenue.venue.id,
  );
  assert.notEqual(
    payload.data.locationContext.selectedVenueId,
    payload.selectedVenue.venue.id,
  );
});
