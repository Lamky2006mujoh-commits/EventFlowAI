import { z } from "zod";
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
  event: "sự kiện",
  day: "ngày",
  half_day: "buổi",
  hour: "giờ",
  person: "khách",
  package: "gói",
};
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
    "ĐỊA ĐIỂM ĐƯỢC CHỌN",
    v.name,
    v.address,
    "Khu vực: " + v.area,
    "Sức chứa tham khảo: " + (v.capacity ?? "Cần xác nhận"),
    "Giá: " +
      (v.price.min === null
        ? "Cần liên hệ báo giá"
        : v.price.min.toLocaleString("vi-VN") +
          "–" +
          v.price.max!.toLocaleString("vi-VN") +
          " VND / " +
          venueUnitLabels[v.price.unit]),
    "Loại giá: " +
      {
        reference: "Tham khảo từ kết quả tìm kiếm",
        estimate: "Ước tính AI, chưa có báo giá",
        quote_required: "Cần báo giá",
      }[v.price.kind],
    "Số lượng thuê: " + selected.quantity + " " + venueUnitLabels[v.price.unit],
    "Ghi chú giá: " + v.price.notes,
    ...(v.price.evidence
      ? ["Bằng chứng giá tham khảo: " + v.price.evidence]
      : []),
    "Dịch vụ bao gồm: " +
      (v.included.length ? v.included.join("; ") : "Cần xác nhận"),
    "Điều kiện: " + v.conditions.join("; "),
    "Nguồn: " + v.sources.map((s) => s.url).join(", "),
    "Chưa xác nhận tình trạng trống hoặc đặt chỗ.",
  ].join("\n");
}
