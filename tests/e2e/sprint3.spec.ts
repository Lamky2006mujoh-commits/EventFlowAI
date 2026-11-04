import { test, expect } from "@playwright/test";
async function openBrief(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await page.getByText("Beyond the ordinary", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Turn your brief into a proposal" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Generate concepts", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Select concept", exact: true }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Select concept", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Generate proposal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v1 · Draft" }),
  ).toBeVisible();
}
test("generate, compare, select, edit, confirm regeneration, preserve versions, export saved content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openBrief(page);
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Manual theme from browser test");
  await page.getByRole("button", { name: "Save new proposal version" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v2 · Draft" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Unsaved theme excluded from export");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export latest saved (.txt)" })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("proposal-v2.txt");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  expect(text).toContain("Manual theme from browser test");
  expect(text).not.toContain("Unsaved theme");
  expect(text).toContain("Status: Draft");
  await page
    .getByRole("button", { name: "Regenerate proposal", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Theme", exact: true }),
  ).toHaveValue("Unsaved theme excluded from export");
  await page
    .getByRole("button", { name: "Regenerate proposal", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm replacement" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v3 · Draft" }),
  ).toBeVisible();
  await page.getByLabel("Saved version history").selectOption("2");
  await expect(page.locator(".proposal-snapshot")).toContainText(
    "Manual theme from browser test",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.getByText("Beyond the ordinary", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v3 · Draft" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/previews/sprint3-proposal.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("mobile concept comparison is usable without horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openBrief(page);
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        left: e.getBoundingClientRect().left,
        right: e.getBoundingClientRect().right,
      }))
      .filter((e) => e.right > window.innerWidth + 1),
  );
  expect(overflow).toEqual([]);
  await page.screenshot({
    path: "docs/previews/sprint3-mobile.png",
    fullPage: true,
  });
});

test("export failure leaves saved proposal and Draft status intact", async ({
  page,
}) => {
  await openBrief(page);
  await page.evaluate(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("eventflow.sprint3."))
        throw new Error("Simulated export read failure");
      return original.call(this, key);
    };
  });
  await page
    .getByRole("button", { name: "Export latest saved (.txt)" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Simulated export read failure",
  );
  await expect(
    page.getByRole("heading", { name: "Proposal · v1 · Draft" }),
  ).toBeVisible();
  await page.reload();
  await page.getByText("Beyond the ordinary", { exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v1 · Draft" }),
  ).toBeVisible();
});

test("unsaved proposal edits require confirmation before navigation", async ({
  page,
}) => {
  await openBrief(page);
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Unsaved manual theme");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "All briefs", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Theme", exact: true }),
  ).toHaveValue("Unsaved manual theme");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "All briefs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Client briefs", exact: true }),
  ).toBeVisible();
});

test("actual Gemini response can be reviewed, edited and exported in the UI", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  const evidence = JSON.parse(
    await readFile(
      new URL("../../docs/previews/sprint3-live-gemini.json", import.meta.url),
      "utf8",
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await page.evaluate((e) => {
    const concepts = e.concepts.map((c: unknown, i: number) => ({
      ...(c as object),
      id: "80000000-0000-4000-8000-00000000000" + (i + 1),
    }));
    const proposal = {
      data: e.proposal,
      version: 1,
      briefVersion: 1,
      conceptId: concepts[0].id,
      status: "Draft",
      author: "Quỳnh Hương",
      createdAt: e.completedAt,
    };
    localStorage.setItem(
      "eventflow.sprint3.b1000000-0000-4000-8000-000000000001",
      JSON.stringify({
        revision: 1,
        briefVersion: 1,
        concepts,
        selectedId: concepts[0].id,
        proposal,
        history: [proposal],
      }),
    );
  }, evidence);
  await page.getByText("Beyond the ordinary", { exact: true }).first().click();
  await expect(
    page.getByRole("textbox", { name: "Proposal title", exact: true }),
  ).toHaveValue(evidence.proposal.title);
  await expect(page.locator(".concept-card")).toHaveCount(
    evidence.concepts.length,
  );
  await page
    .getByRole("button", { name: "Thêm bảng ngân sách dự kiến", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Human-reviewed: " + evidence.proposal.theme);
  await page.getByRole("button", { name: "Save new proposal version" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v2 · Draft" }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export latest saved (.txt)" })
    .click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toContain(
    "Human-reviewed: " + evidence.proposal.theme,
  );
  await page.screenshot({
    path: "docs/previews/sprint3-real-ai.png",
    fullPage: true,
  });
});

test("venue choice itemizes rental, preserves manual edits, exports costs and restores after reload", async ({
  page,
}) => {
  await openBrief(page);
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Manual venue test theme");
  await page.getByRole("button", { name: "Save new proposal version" }).click();
  await page
    .getByRole("textbox", { name: "Theme", exact: true })
    .fill("Unsaved draft retained during search");
  await page
    .getByRole("button", { name: "Tìm địa điểm trên web", exact: true })
    .click();
  await expect(page.locator(".venue-card")).toHaveCount(3);
  await expect(
    page.getByRole("textbox", { name: "Theme", exact: true }),
  ).toHaveValue("Unsaved draft retained during search");
  await page.locator(".venue-card").first().getByRole("spinbutton").fill("2");
  await page
    .getByRole("button", { name: "Dùng địa điểm này", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirm replacement" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v3 · Draft" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Theme", exact: true }),
  ).toHaveValue("Manual venue test theme");
  await expect(
    page.getByRole("spinbutton", { name: "Số lượng chi phí 1", exact: true }),
  ).toHaveValue("2");
  await expect(
    page.getByRole("spinbutton", { name: "Đơn giá chi phí 1", exact: true }),
  ).toHaveValue("12000000");
  await page
    .getByRole("spinbutton", { name: "Đơn giá chi phí 2", exact: true })
    .fill("100000000");
  await expect(page.locator(".budget-over")).toBeVisible();
  await page.getByRole("button", { name: "Save new proposal version" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal · v4 · Draft" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export latest saved (.txt)" })
    .click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString();
  expect(exported).toContain("Manual venue test theme");
  expect(exported).toContain("24.000.000");
  expect(exported).not.toContain("[object Object]");
  await page.reload();
  await page.getByText("Beyond the ordinary", { exact: true }).first().click();
  await expect(page.locator(".selected-venue-note")).toContainText("2 ngày");
  await page.screenshot({
    path: "docs/previews/budget-venues-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/previews/budget-venues-mobile.png",
    fullPage: true,
  });
});

for (const [area, scope] of [
  ["TP.HCM", "Tìm toàn khu vực và các thành phố lân cận"],
  ["Việt Nam", "Tìm trên toàn Việt Nam"],
])
  test(
    "venue search before concepts respects brief area: " + area,
    async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Enter demo workspace" }).click();
      await page
        .getByText("Beyond the ordinary", { exact: true })
        .first()
        .click();
      await page
        .getByRole("button", { name: "Edit current brief", exact: true })
        .click();
      await page
        .getByLabel("Venue / proposed location *", { exact: true })
        .fill(area);
      await page
        .getByRole("button", { name: "Save version 2", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Turn your brief into a proposal" }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Tìm và chọn địa điểm" }),
      ).toContainText(scope);
      await page
        .getByRole("button", { name: "Tìm địa điểm trên web", exact: true })
        .click();
      await expect(page.locator(".venue-card")).toHaveCount(3);
      await page
        .getByRole("button", { name: "Dùng địa điểm này", exact: true })
        .first()
        .click();
      await expect(page.locator(".selected-venue-note")).toBeVisible();
      await expect(page.locator(".concept-card")).toHaveCount(0);
    },
  );
