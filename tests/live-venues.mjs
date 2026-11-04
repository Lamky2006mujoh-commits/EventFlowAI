import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { searchVenues } from "../supabase/functions/_shared/venue-search.ts";
const area = process.env.VENUE_TEST_AREA || "TP.HCM";
const result = await searchVenues(
  {
    version: 1,
    data: {
      title: "Public venue search acceptance",
      client: "Sample",
      eventType: "Workshop",
      date: "2026-11-28",
      venue: area,
      attendees: 80,
      budget: 100000000,
      objectives: "Plan a public sample event.",
      audience: "Event planners",
      constraints: "Indoor space, accessible entry and parking.",
    },
  },
  "Ưu tiên giá thuê công khai, xem cả các thành phố lân cận.",
  {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  },
);
assert.equal(result.method, "web");
assert.ok(result.sources.length);
assert.ok(result.options.length);
console.log(
  "PASS: grounded venue search: " +
    result.area +
    " / " +
    result.scope +
    " / " +
    result.options.length +
    " options / " +
    result.sources.length +
    " web sources.",
);
console.log(
  JSON.stringify(
    result.options.map((v) => ({
      name: v.name,
      area: v.area,
      price: v.price.kind,
      unit: v.price.unit,
    })),
    null,
    2,
  ),
);
await mkdir(new URL("../docs/previews/", import.meta.url), { recursive: true });
await writeFile(
  new URL(
    "../docs/previews/venues-live-" +
      (result.scope === "nationwide" ? "vietnam" : "hcm") +
      ".json",
    import.meta.url,
  ),
  JSON.stringify(result, null, 2) + "\n",
);
