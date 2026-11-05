import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tavilyVenueSources,
  venueSearchProvider,
} from "../supabase/functions/_shared/tavily.ts";
import { searchVenues } from "../supabase/functions/_shared/venue-search.ts";

const brief = {
  title: "Private event",
  client: "Private client",
  eventType: "Workshop",
  date: "2027-02-01",
  venue: "New York",
  attendees: 100,
  budget: 100000000,
  objectives: "Private objectives",
  audience: "Team",
  constraints: "Private details",
};
const result = {
  title: "Official venue",
  url: "https://venue.example/rental",
  content:
    "Venue A in New York has capacity 150. Rental price requires a quote.",
};

test("Tavily basic search uses one bounded request and excludes private brief fields", async () => {
  const web = await tavilyVenueSources(
    brief,
    "parking",
    "private-key",
    async (url, init) => {
      assert.equal(url, "https://api.tavily.com/search");
      assert.equal(init.headers.Authorization, "Bearer private-key");
      const request = JSON.parse(init.body);
      assert.equal(request.search_depth, "basic");
      assert.equal(request.auto_parameters, false);
      assert.equal(request.max_results, 6);
      assert.match(request.query, /New York/);
      assert.ok(!init.body.includes("Private"));
      return Response.json({
        results: [result, result, { ...result, url: "http://unsafe.example" }],
      });
    },
  );
  assert.equal(web.sources.length, 1);
  assert.match(web.report, /Source 0/);
});

test("Tavily key, credit and malformed-response errors are controlled and never trigger fallback calls", async () => {
  await assert.rejects(
    () =>
      tavilyVenueSources(brief, "", "", async () => {
        throw new Error("Must not call provider");
      }),
    /Add TAVILY_API_KEY/,
  );
  for (const [status, pattern] of [
    [401, /rejected TAVILY_API_KEY/],
    [429, /credits or rate/],
    [432, /credits or rate/],
    [503, /unavailable/],
  ]) {
    let calls = 0;
    await assert.rejects(
      () =>
        tavilyVenueSources(brief, "", "private-key", async () => {
          calls++;
          return new Response("private-provider-body", { status });
        }),
      (error) => {
        assert.match(error.message, pattern);
        assert.ok(!error.message.includes("private"));
        return true;
      },
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    () =>
      tavilyVenueSources(brief, "", "fixture", async () =>
        Response.json({ results: "invalid" }),
      ),
    /invalid search data/,
  );
  assert.equal(
    venueSearchProvider(() => undefined),
    "tavily",
  );
  assert.equal(
    venueSearchProvider(() => "google"),
    "google",
  );
  assert.throws(
    () => venueSearchProvider(() => "unknown"),
    /must be tavily or google/,
  );
});

test("Tavily sources feed Gemini extraction without invoking Google Search grounding", async () => {
  const urls = [];
  const output = await searchVenues({ version: 1, data: brief }, "", {
    apiKey: "gemini-fixture",
    model: "legacy-search-model",
    extractionModel: "text-model",
    provider: "tavily",
    tavilyApiKey: "tavily-fixture",
    fetcher: async (url, init) => {
      urls.push(String(url));
      if (urls.length === 1) return Response.json({ results: [result] });
      assert.match(url, /models\/text-model:generateContent$/);
      assert.equal(JSON.parse(init.body).tools, undefined);
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "Venue requires confirmation",
                    venues: [
                      {
                        name: "Venue A",
                        address: "New York",
                        area: "New York",
                        capacity: 150,
                        suitability: "Workshop",
                        price: {
                          kind: "quote_required",
                          min: null,
                          max: null,
                          unit: "event",
                          evidence: "",
                          notes: "Contact venue",
                        },
                        included: [],
                        conditions: ["Confirm availability"],
                        sourceIndices: [0],
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  });
  assert.equal(urls.length, 2);
  assert.equal(output.method, "web");
  assert.equal(output.options[0].sources[0].url, result.url);
  assert.equal(output.options[0].price.kind, "quote_required");
});
