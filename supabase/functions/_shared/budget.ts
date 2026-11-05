import { z } from "zod";
import { englishPlanningText } from "./english.ts";
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
  venue: "Venue",
  catering: "Catering",
  production: "Stage, sound & lighting",
  decoration: "Decoration",
  staffing: "Staffing",
  marketing: "Marketing",
  transport: "Transport",
  permits: "Safety, permits & insurance",
  other: "Other costs",
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
        unit: category === "catering" ? "person" : "package",
        unitCost: Math.floor((base * weights[i]) / weight / quantity),
        notes:
          "Estimated allocation; confirm supplier quotes and service scope.",
      };
    }),
    contingencyPercent: 10,
    taxPercent: 0,
    assumptions:
      "This is an estimated allocation based on the brief, not a supplier quote. Tax/VAT is unconfirmed; enter the rate after receiving quotes. Contingency applies to the subtotal; tax applies to subtotal plus contingency.",
  };
}
export function budgetText(b: Budget) {
  const t = budgetTotals(b, 0);
  return [
    "ESTIMATED BUDGET (VND)",
    ...b.items.map(
      (i) =>
        budgetCategoryLabels[i.category] +
        " — " +
        englishPlanningText(i.description) +
        ": " +
        i.quantity +
        " " +
        englishPlanningText(i.unit) +
        " × " +
        i.unitCost.toLocaleString("en-US") +
        " = " +
        (i.quantity * i.unitCost).toLocaleString("en-US") +
        " VND" +
        (i.notes ? " (" + englishPlanningText(i.notes) + ")" : ""),
    ),
    "Subtotal: " + t.subtotal.toLocaleString("en-US") + " VND",
    "Contingency (" +
      b.contingencyPercent +
      "%): " +
      t.contingency.toLocaleString("en-US") +
      " VND",
    "Estimated tax (" +
      b.taxPercent +
      "%): " +
      t.tax.toLocaleString("en-US") +
      " VND",
    "Estimated total: " + t.total.toLocaleString("en-US") + " VND",
    "Assumptions: " + englishPlanningText(b.assumptions),
  ].join("\n");
}
