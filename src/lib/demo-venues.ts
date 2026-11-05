import type { BriefData } from "../../supabase/functions/_shared/contracts.ts";
import {
  venueSearchArea,
  type VenueSearch,
} from "../../supabase/functions/_shared/venues.ts";
export function demoVenueSearch(brief: {
  version: number;
  data: BriefData;
}): VenueSearch {
  const area = venueSearchArea(brief.data.venue);
  return {
    ...area,
    briefVersion: brief.version,
    checkedAt: new Date().toISOString(),
    method: "demo",
    summary:
      "Sample venues and prices for testing interactions. These are not web search results.",
    searchSuggestions: "",
    sources: [
      { title: "Sample fixture", url: "https://example.invalid/demo-venues" },
    ],
    options: [
      "Sample convention center",
      "Sample event space",
      "Sample resort",
    ].map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      address: "Illustrative address — replace with real search results",
      area: area.area,
      capacity: brief.data.attendees + 50 + i * 100,
      suitability: "Sample data matching the brief size.",
      price: {
        kind: "estimate",
        min: (i + 1) * 10000000,
        max: (i + 1) * 12000000,
        unit: "day",
        evidence: "",
        notes: "Illustrative estimate, not a supplier quote.",
      },
      included: ["Sample tables and chairs"],
      conditions: [
        "Confirm rental hours, deposits and overtime fees.",
        "Availability has not been checked.",
      ],
      sources: [
        { title: "Sample fixture", url: "https://example.invalid/demo-venues" },
      ],
      availability: "not_checked",
    })),
  };
}
