import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetSchema,
  budgetTotals,
  baselineBudget,
  budgetCategories,
} from "../supabase/functions/_shared/budget.ts";
import {
  venueSearchArea,
  venueSearchSchema,
} from "../supabase/functions/_shared/venues.ts";
import { searchVenues } from "../supabase/functions/_shared/venue-search.ts";
import {
  generatedProposalSchema,
  proposalDataSchema,
  proposalText,
} from "../supabase/functions/_shared/planning.ts";
import { demo, demoPeople } from "../src/lib/demo.ts";
class Storage {
  values = new Map();
  getItem(k) {
    return this.values.get(k) ?? null;
  }
  setItem(k, v) {
    this.values.set(k, String(v));
  }
  removeItem(k) {
    this.values.delete(k);
  }
}
beforeEach(() => {
  globalThis.localStorage = new Storage();
  globalThis.sessionStorage = new Storage();
});
const brief = () => demo.login(demoPeople[0].id).briefs[0];
const cmd = (b, s, action, extra = {}) => ({
  action,
  briefId: b.id,
  briefVersion: b.version,
  expectedRevision: s.revision,
  ...extra,
});
test("itemized budget computes exact VND subtotal, contingency, tax and overspend", () => {
  const budget = {
    currency: "VND",
    items: [
      {
        category: "venue",
        description: "Hall",
        quantity: 2,
        unit: "days",
        unitCost: 100,
        notes: "",
      },
      {
        category: "catering",
        description: "Meals",
        quantity: 3,
        unit: "people",
        unitCost: 50,
        notes: "",
      },
    ],
    contingencyPercent: 10,
    taxPercent: 8,
    assumptions: "",
  };
  assert.deepEqual(budgetTotals(budget, 400), {
    subtotal: 350,
    contingency: 35,
    tax: 31,
    total: 416,
    remaining: -16,
    overBudget: true,
  });
  for (const patch of [
    { quantity: -1 },
    { quantity: 1.5 },
    { unitCost: -1 },
    { unitCost: Infinity },
    { unitCost: 1e13 },
  ])
    assert.equal(
      budgetSchema.safeParse({
        ...budget,
        items: [{ ...budget.items[0], ...patch }],
      }).success,
      false,
    );
  assert.equal(
    budgetSchema.safeParse({ ...budget, taxPercent: 101 }).success,
    false,
  );
  assert.equal(budgetSchema.safeParse({ ...budget, items: [] }).success, false);
});
test("baseline covers all cost categories within brief ceiling; old snapshots remain readable", () => {
  const budget = baselineBudget(120000000, 200);
  assert.equal(budgetSchema.safeParse(budget).success, true);
  assert.deepEqual(
    budget.items.map((i) => i.category),
    [...budgetCategories],
  );
  assert.ok(budgetTotals(budget, 120000000).remaining >= 0);
  const old = {
    title: "Proposal",
    objectives: "Objective",
    audience: "Team",
    theme: "Theme",
    agenda: "Agenda",
    assumptions: "Unknown quotes",
  };
  assert.equal(proposalDataSchema.safeParse(old).success, true);
  assert.equal(generatedProposalSchema.safeParse(old).success, false);
});
test("search area is all Vietnam for a country, and whole city plus nearby for cities", () => {
  for (const area of ["Việt Nam", "Viet Nam", "Vietnam", "VN", "Toàn quốc"])
    assert.equal(venueSearchArea(area).scope, "nationwide");
  for (const area of [
    "TP.HCM",
    "Hà Nội",
    "Đà Nẵng",
    "GEM Center, Ho Chi Minh City",
  ])
    assert.deepEqual(venueSearchArea(area), { area, scope: "city_and_nearby" });
});
test("venue selection updates rent and appends a proposal version without losing other manual edits", async () => {
  const b = brief();
  let s = await demo.planning({ action: "load", briefId: b.id });
  s = await demo.planning(cmd(b, s, "searchVenues"));
  assert.equal(s.venueSearch.method, "demo");
  s = await demo.planning(
    cmd(b, s, "selectVenue", {
      venueId: s.venueSearch.options[0].id,
      quantity: 2,
    }),
  );
  assert.equal(s.proposal, null);
  s = await demo.planning(cmd(b, s, "generateConcepts"));
  s = await demo.planning(cmd(b, s, "select", { conceptId: s.concepts[0].id }));
  s = await demo.planning(cmd(b, s, "generateProposal"));
  assert.equal(s.proposal.data.venue.venue.id, s.selectedVenue.venue.id);
  assert.equal(
    s.proposal.data.budget.items.find((i) => i.category === "venue").unitCost,
    12000000,
  );
  s = await demo.planning(
    cmd(b, s, "saveProposal", {
      data: { ...s.proposal.data, objectives: "Manual objective stays intact" },
    }),
  );
  const saved = structuredClone(s.proposal.data);
  const food = saved.budget.items.find((i) => i.category === "catering");
  s = await demo.planning(
    cmd(b, s, "selectVenue", {
      venueId: s.venueSearch.options[1].id,
      quantity: 1,
    }),
  );
  assert.equal(s.proposal.version, 3);
  assert.equal(s.proposal.data.objectives, saved.objectives);
  assert.deepEqual(
    s.proposal.data.budget.items.find((i) => i.category === "catering"),
    food,
  );
  assert.equal(s.history[1].data.venue.venue.id, saved.venue.venue.id);
  assert.match(proposalText(s.proposal), /ESTIMATED BUDGET/);
  assert.match(proposalText(s.proposal), /SELECTED VENUE/);
  assert.ok(!proposalText(s.proposal).includes("[object Object]"));
});
test("venue writes reject foreign IDs, stale source brief and cross-agency access", async () => {
  let b = brief();
  let s = await demo.planning({ action: "load", briefId: b.id });
  s = await demo.planning(cmd(b, s, "searchVenues"));
  await assert.rejects(
    () =>
      demo.planning(
        cmd(b, s, "selectVenue", { venueId: crypto.randomUUID(), quantity: 1 }),
      ),
    /Venue not found/,
  );
  demo.save({ ...b.data, venue: "Việt Nam" }, b.id, b.version);
  b = demo.load().briefs[0];
  await assert.rejects(
    () =>
      demo.planning(
        cmd(b, s, "selectVenue", {
          venueId: s.venueSearch.options[0].id,
          quantity: 1,
        }),
      ),
    /brief changed/,
  );
  s = await demo.planning(cmd(b, s, "searchVenues"));
  assert.equal(s.venueSearch.scope, "nationwide");
  demo.login(demoPeople[2].id);
  await assert.rejects(
    () => demo.planning(cmd(b, s, "searchVenues")),
    /not found in your agency/,
  );
});
const report =
  "Venue A has public rental of 20.000.000 VND / ngày. Capacity 200. Deposit requires confirmation.";
const extracted = {
  summary: "Four sources were reviewed.",
  venues: [
    {
      name: "Venue A",
      address: "HCMC public address",
      area: "TP.HCM",
      capacity: 200,
      suitability: "Fits workshop",
      price: {
        kind: "reference",
        min: 20000000,
        max: 20000000,
        unit: "day",
        evidence: "20.000.000 VND / ngày",
        notes: "Confirm date and VAT.",
      },
      included: ["Chairs"],
      conditions: ["Deposit requires confirmation."],
      sourceIndices: [0],
    },
  ],
};
function provider(value = extracted) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    fetcher: async (_url, init) => {
      calls++;
      const input = JSON.parse(init.body);
      if (calls === 1) {
        assert.match(input.systemInstruction.parts[0].text, /English/);
        assert.deepEqual(input.tools, [{ google_search: {} }]);
        return new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: report }] },
                groundingMetadata: {
                  groundingChunks: [
                    {
                      web: {
                        uri: "https://venue.example/rates",
                        title: "Official rental rates",
                      },
                    },
                  ],
                  searchEntryPoint: {
                    renderedContent: "<div>Search suggestions</div>",
                  },
                },
              },
            ],
          }),
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(value) }] },
            },
          ],
        }),
      );
    },
  };
}
test("grounded search uses web sources, explicit city scope, truthful units and evidence", async () => {
  const b = brief(),
    p = provider();
  const result = await searchVenues(
    { version: 1, data: { ...b.data, venue: "TP.HCM" } },
    "",
    { apiKey: "server-only", model: "gemini-3.5-flash", fetcher: p.fetcher },
  );
  assert.equal(result.method, "web");
  assert.equal(result.scope, "city_and_nearby");
  assert.equal(result.options[0].price.kind, "reference");
  assert.equal(result.options[0].sources[0].url, "https://venue.example/rates");
  assert.equal(result.options[0].availability, "not_checked");
  assert.equal(p.calls, 2);
  assert.equal(venueSearchSchema.safeParse(result).success, true);
});
test("unsubstantiated published prices are downgraded; out-of-range citations cannot become venue sources", async () => {
  const b = brief(),
    bad = structuredClone(extracted);
  bad.venues[0].price.evidence = "Claim not in search report";
  let p = provider(bad);
  let result = await searchVenues({ version: 1, data: b.data }, "", {
    apiKey: "key",
    model: "test",
    fetcher: p.fetcher,
  });
  assert.equal(result.options[0].price.kind, "quote_required");
  assert.equal(result.options[0].price.max, null);
  bad.venues[0].sourceIndices = [999];
  p = provider(bad);
  result = await searchVenues({ version: 1, data: b.data }, "", {
    apiKey: "key",
    model: "test",
    fetcher: p.fetcher,
  });
  assert.equal(result.options.length, 0);
});
test("venue grounding quota is not retried or passed to extraction", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      searchVenues({ version: 1, data: brief().data }, "", {
        apiKey: "private-fixture",
        model: "test",
        fetcher: async () => {
          calls++;
          return new Response("private-provider-body", { status: 429 });
        },
        sleep: async () => {
          throw new Error("No retry after quota denial");
        },
      }),
    (error) => {
      assert.match(error.message, /grounding allowance is 0/);
      assert.match(error.message, /GEMINI_VENUE_MODEL/);
      assert.ok(!error.message.includes("private"));
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("unavailable legacy grounding model returns actionable guidance without retries", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      searchVenues({ version: 1, data: brief().data }, "", {
        apiKey: "fixture",
        model: "gemini-2.5-flash-lite",
        fetcher: async () => {
          calls++;
          return new Response("private-provider-details", { status: 404 });
        },
      }),
    /Google limits Gemini 2.5 access to existing users/,
  );
  assert.equal(calls, 1);
});

test("grounding and structured extraction route to their configured models", async () => {
  const p = provider();
  const urls = [];
  await searchVenues({ version: 1, data: brief().data }, "", {
    apiKey: "fixture",
    model: "search-model",
    extractionModel: "text-model",
    fetcher: async (url, init) => {
      urls.push(String(url));
      return p.fetcher(url, init);
    },
  });
  assert.match(urls[0], /models\/search-model:generateContent$/);
  assert.match(urls[1], /models\/text-model:generateContent$/);
});

test("search refuses unsourced output and redacts permanent provider errors", async () => {
  const b = brief();
  await assert.rejects(
    () =>
      searchVenues({ version: 1, data: b.data }, "", {
        apiKey: "secret-fixture",
        model: "test",
        fetcher: async () =>
          new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: { parts: [{ text: "Invented venue" }] },
                },
              ],
            }),
          ),
      }),
    /No web-backed/,
  );
  await assert.rejects(
    () =>
      searchVenues({ version: 1, data: b.data }, "", {
        apiKey: "secret-fixture",
        model: "test",
        fetcher: async () => new Response("secret-fixture", { status: 403 }),
      }),
    (e) => !e.message.includes("secret-fixture"),
  );
});

test("venue export retains price caveats, evidence and included services", async () => {
  const b = brief();
  let s = await demo.planning({ action: "load", briefId: b.id });
  s = await demo.planning(cmd(b, s, "searchVenues"));
  s = await demo.planning(
    cmd(b, s, "selectVenue", {
      venueId: s.venueSearch.options[0].id,
      quantity: 2,
    }),
  );
  const { selectedVenueText } =
    await import("../supabase/functions/_shared/venues.ts");
  const selected = structuredClone(s.selectedVenue);
  selected.venue.price.notes = "VAT not confirmed; deposit excluded.";
  selected.venue.price.evidence = "Public rate: 12.000.000 VND / day";
  selected.venue.included = ["Stage", "Chairs"];
  const exported = selectedVenueText(selected);
  assert.match(exported, /VAT not confirmed; deposit excluded/);
  assert.match(exported, /Public rate: 12.000.000 VND/);
  assert.match(exported, /Stage; Chairs/);
  assert.match(exported, /2 days/);
  assert.ok(!exported.includes("[object Object]"));
});

test("venue search handles malformed provider payloads as controlled failures without extraction", async () => {
  const b = brief();
  const { GenerationError } =
    await import("../supabase/functions/_shared/gemini.ts");
  for (const payload of [
    "private-invalid-json",
    "null",
    JSON.stringify({
      candidates: [
        { finishReason: "STOP", content: { parts: "private-invalid-parts" } },
      ],
    }),
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        searchVenues({ version: 1, data: b.data }, "", {
          apiKey: "fixture-secret",
          model: "test",
          fetcher: async () => {
            calls++;
            return new Response(payload);
          },
        }),
      (error) => {
        assert.ok(error instanceof GenerationError);
        assert.match(error.message, /invalid.*response/i);
        assert.ok(!error.message.includes("private"));
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});
