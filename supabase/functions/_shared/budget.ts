import { z } from "zod";
export const budgetCategories = [
  "venue",
  "catering",
  "production",
  "decoration",
  "staffing",
  "marketing",
  "transport",
  "permits",
  "other",
] as const;
export const budgetCategoryLabels: Record<
  (typeof budgetCategories)[number],
  string
> = {
  venue: "Địa điểm",
  catering: "Ăn uống",
  production: "Sân khấu, âm thanh & ánh sáng",
  decoration: "Trang trí",
  staffing: "Nhân sự",
  marketing: "Truyền thông",
  transport: "Vận chuyển",
  permits: "An toàn, giấy phép & bảo hiểm",
  other: "Chi phí khác",
};
export const budgetItemSchema = z.object({
  category: z.enum(budgetCategories),
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1).max(100000),
  unit: z.string().trim().min(1).max(40),
  unitCost: z.number().int().min(0).max(1e12),
  notes: z.string().max(1000),
});
export const budgetSchema = z
  .object({
    currency: z.literal("VND"),
    items: z.array(budgetItemSchema).min(1).max(40),
    contingencyPercent: z.number().min(0).max(50),
    taxPercent: z.number().min(0).max(100),
    assumptions: z.string().max(2000),
  })
  .refine(
    (b) => b.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0) <= 1e12,
    { message: "Budget subtotal exceeds the supported limit." },
  );
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export function budgetTotals(b: Budget, limit: number) {
  const subtotal = b.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const contingency = Math.round((subtotal * b.contingencyPercent) / 100);
  const tax = Math.round(((subtotal + contingency) * b.taxPercent) / 100);
  const total = subtotal + contingency + tax;
  return {
    subtotal,
    contingency,
    tax,
    total,
    remaining: limit - total,
    overBudget: total > limit,
  };
}
export function baselineBudget(limit: number, attendees: number): Budget {
  const weights = [25, 25, 15, 8, 8, 5, 4, 3, 2],
    base = Math.floor(limit / 1.1),
    weight = weights.reduce((s, n) => s + n, 0);
  return {
    currency: "VND",
    items: budgetCategories.map((category, i) => {
      const quantity = category === "catering" ? attendees : 1;
      return {
        category,
        description: budgetCategoryLabels[category],
        quantity,
        unit: category === "catering" ? "khách" : "gói",
        unitCost: Math.floor((base * weights[i]) / weight / quantity),
        notes: "Phân bổ dự kiến; cần xác nhận báo giá và phạm vi dịch vụ.",
      };
    }),
    contingencyPercent: 10,
    taxPercent: 0,
    assumptions:
      "Đây là phân bổ ước tính theo brief, chưa phải báo giá. Thuế/VAT chưa xác nhận; nhập tỷ lệ sau khi nhận báo giá. Chi phí dự phòng tính trên tạm tính; thuế tính trên tạm tính cộng dự phòng.",
  };
}
export function budgetText(b: Budget) {
  const t = budgetTotals(b, 0);
  return [
    "NGÂN SÁCH DỰ KIẾN (VND)",
    ...b.items.map(
      (i) =>
        budgetCategoryLabels[i.category] +
        " — " +
        i.description +
        ": " +
        i.quantity +
        " " +
        i.unit +
        " × " +
        i.unitCost.toLocaleString("vi-VN") +
        " = " +
        (i.quantity * i.unitCost).toLocaleString("vi-VN") +
        " VND" +
        (i.notes ? " (" + i.notes + ")" : ""),
    ),
    "Tạm tính: " + t.subtotal.toLocaleString("vi-VN") + " VND",
    "Dự phòng (" +
      b.contingencyPercent +
      "%): " +
      t.contingency.toLocaleString("vi-VN") +
      " VND",
    "Thuế dự kiến (" +
      b.taxPercent +
      "%): " +
      t.tax.toLocaleString("vi-VN") +
      " VND",
    "Tổng dự kiến: " + t.total.toLocaleString("vi-VN") + " VND",
    "Giả định: " + b.assumptions,
  ].join("\n");
}
