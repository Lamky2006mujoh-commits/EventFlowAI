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
      "Địa điểm và giá mẫu để kiểm tra thao tác. Đây không phải kết quả tìm trên web.",
    searchSuggestions: "",
    sources: [
      { title: "Sample fixture", url: "https://example.invalid/demo-venues" },
    ],
    options: [
      "Trung tâm hội nghị mẫu",
      "Không gian sự kiện mẫu",
      "Khu nghỉ dưỡng mẫu",
    ].map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      address: "Địa chỉ minh họa — cần thay bằng kết quả tìm thực tế",
      area: area.area,
      capacity: brief.data.attendees + 50 + i * 100,
      suitability: "Dữ liệu mẫu phù hợp quy mô brief.",
      price: {
        kind: "estimate",
        min: (i + 1) * 10000000,
        max: (i + 1) * 12000000,
        unit: "day",
        evidence: "",
        notes: "Giá ước tính minh họa, không phải báo giá.",
      },
      included: ["Bàn ghế mẫu"],
      conditions: [
        "Cần xác nhận giờ thuê, đặt cọc và phí ngoài giờ.",
        "Chưa kiểm tra tình trạng trống.",
      ],
      sources: [
        { title: "Sample fixture", url: "https://example.invalid/demo-venues" },
      ],
      availability: "not_checked",
    })),
  };
}
