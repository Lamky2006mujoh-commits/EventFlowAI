import { z } from "zod";
import { englishPlanningText } from "./english.ts";
const short = z.string().trim().min(1).max(1000);
export const sourceSchema = z.object({
  title: z.string().max(500),
  url: z
    .url()
    .refine((s) => new URL(s).protocol === "https:", "HTTPS source required"),
});
export const venuePriceSchema = z
  .object({
    kind: z.enum(["reference", "estimate", "quote_required"]),
    min: z.number().int().min(0).max(1e12).nullable(),
    max: z.number().int().min(0).max(1e12).nullable(),
    unit: z.enum(["event", "day", "half_day", "hour", "person", "package"]),
    evidence: z.string().max(1000),
    notes: z.string().max(1000),
  })
  .refine(
    (p) =>
      p.kind === "quote_required"
        ? p.min === null && p.max === null
        : p.min !== null && p.max !== null && p.max >= p.min,
    { message: "Invalid venue price range" },
  );
export const venueSchema = z.object({
  id: z.uuid(),
  name: short,
  address: short,
  area: short,
  capacity: z.number().int().min(1).max(100000).nullable(),
  suitability: short,
  price: venuePriceSchema,
  included: z.array(short).max(12),
  conditions: z.array(short).min(1).max(15),
  sources: z.array(sourceSchema).min(1).max(8),
  availability: z.literal("not_checked"),
});
export const venueSearchSchema = z.object({
  area: short,
  scope: z.enum(["nationwide", "city_and_nearby"]),
  briefVersion: z.number().int().positive(),
  checkedAt: z.iso.datetime({ offset: true }),
  method: z.enum(["web", "demo"]),
  options: z.array(venueSchema).max(8),
  sources: z.array(sourceSchema).max(30),
  searchSuggestions: z.string().max(50000),
  summary: z.string().max(2000),
});
export const selectedVenueSchema = z.object({
  venue: venueSchema,
  quantity: z.number().int().min(1).max(100000),
  briefVersion: z.number().int().positive(),
  selectedAt: z.iso.datetime({ offset: true }),
});
export type Venue = z.infer<typeof venueSchema>;
export type VenueSearch = z.infer<typeof venueSearchSchema>;
export type SelectedVenue = z.infer<typeof selectedVenueSchema>;
export const venueUnitLabels: Record<Venue["price"]["unit"], string> = {
  event: "event",
  day: "day",
  half_day: "half-day",
  hour: "hour",
  person: "person",
  package: "package",
};
export function venueQuantityText(
  quantity: number,
  unit: Venue["price"]["unit"],
) {
  const label =
    quantity === 1
      ? venueUnitLabels[unit]
      : unit === "person"
        ? "people"
        : venueUnitLabels[unit] + "s";
  return quantity.toLocaleString("en-US") + " " + label;
}
export function venueSearchArea(value: string) {
  const area = value.trim();
  const normalized = area
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const nationwide = ["vietnam", "vn", "toanquoc", "allvietnam"].includes(
    normalized,
  );
  return {
    area: area || "TP.HCM",
    scope: nationwide ? ("nationwide" as const) : ("city_and_nearby" as const),
  };
}
export function selectedVenueText(selected: SelectedVenue) {
  const v = selected.venue;
  return [
    "SELECTED VENUE",
    v.name,
    v.address,
    "Area: " + v.area,
    "Reference capacity: " + (v.capacity ?? "Confirmation required"),
    "Price: " +
      (v.price.min === null
        ? "Quote required"
        : v.price.min.toLocaleString("en-US") +
          "–" +
          v.price.max!.toLocaleString("en-US") +
          " VND / " +
          venueUnitLabels[v.price.unit]),
    "Price type: " +
      {
        reference: "Search reference price",
        estimate: "AI estimate, not a supplier quote",
        quote_required: "Quote required",
      }[v.price.kind],
    "Rental quantity: " + venueQuantityText(selected.quantity, v.price.unit),
    "Price notes: " + englishPlanningText(v.price.notes),
    ...(v.price.evidence
      ? ["Reference price evidence: " + v.price.evidence]
      : []),
    "Included services: " +
      (v.included.length
        ? v.included.map(englishPlanningText).join("; ")
        : "Confirmation required"),
    "Conditions: " + v.conditions.map(englishPlanningText).join("; "),
    "Source: " + v.sources.map((s) => s.url).join(", "),
    "Availability and booking are not confirmed.",
  ].join("\n");
}
