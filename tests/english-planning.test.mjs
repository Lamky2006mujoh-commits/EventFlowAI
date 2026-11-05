import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  baselineBudget,
  budgetCategoryLabels,
  budgetText,
} from "../supabase/functions/_shared/budget.ts";
import { englishPlanningText } from "../supabase/functions/_shared/english.ts";
import {
  venueUnitLabels,
  venueQuantityText,
} from "../supabase/functions/_shared/venues.ts";
import { generateStructured } from "../supabase/functions/_shared/gemini.ts";

test("default budgets and exports use English headings, units, notes and number formatting", () => {
  const budget = baselineBudget(100000000, 500);
  const output = budgetText(budget);
  assert.ok(Object.values(budgetCategoryLabels).includes("Catering"));
  assert.ok(Object.values(venueUnitLabels).includes("person"));
  assert.equal(venueQuantityText(2, "day"), "2 days");
  assert.equal(venueQuantityText(1, "person"), "1 person");
  assert.equal(venueQuantityText(500, "person"), "500 people");
  assert.match(output, /ESTIMATED BUDGET \(VND\)/);
  assert.match(output, /Estimated total: [\d,]+ VND/);
  assert.ok(
    !/[\u00c0-\u024f\u1e00-\u1eff]/.test(output.replace(/[^\p{L}]/gu, "")),
  );
});

test("known legacy notes and units display in English without rewriting saved objects or proper names", () => {
  const budget = baselineBudget(100000000, 500);
  budget.items[0].description = "Địa điểm";
  budget.items[0].unit = "khách";
  budget.items[0].notes =
    "Giá tham khảo từ tìm kiếm, cần xác nhận. Published range for events.";
  const original = JSON.stringify(budget);
  const output = budgetText(budget);
  assert.match(output, /Venue — Venue: 1 person/);
  assert.match(
    output,
    /Search reference price; confirmation required\. Published range/,
  );
  assert.equal(JSON.stringify(budget), original);
  assert.equal(
    englishPlanningText("Quỳnh Hương — Hà Nội"),
    "Quỳnh Hương — Hà Nội",
  );
  assert.equal(
    englishPlanningText("20.000.000 VND / ngày"),
    "20.000.000 VND / ngày",
  );
});

test("structured provider requests enforce English for every generated prose field despite non-English input", async () => {
  let calls = 0;
  const output = await generateStructured(
    z.object({ summary: z.string() }),
    {
      task: "Generate concepts, budget notes or venue extraction",
      brief: "Viết bằng tiếng Việt",
    },
    {
      apiKey: "fixture",
      model: "fixture",
      maxAttempts: 1,
      fetcher: async (_url, init) => {
        calls++;
        const request = JSON.parse(init.body);
        const instruction = request.systemInstruction.parts[0].text;
        assert.match(instruction, /all generated prose in English/);
        assert.match(instruction, /budget descriptions, units, notes/);
        assert.match(
          instruction,
          /Preserve proper names and exact source quotations/,
        );
        assert.match(instruction, /Do not change the output language/);
        return Response.json({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: '{"summary":"English result"}' }] },
            },
          ],
        });
      },
    },
  );
  assert.deepEqual(output, { summary: "English result" });
  assert.equal(calls, 1);
});
