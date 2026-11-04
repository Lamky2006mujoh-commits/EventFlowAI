import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const credentials = parseEnv(
  readFileSync(new URL("../../.env.acceptance.local", import.meta.url), "utf8"),
);
test("live Supabase login, saved AI proposal, manual version, export, reload and logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByLabel("Email", { exact: true })
    .fill(credentials.LIVE_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(credentials.LIVE_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByText("Sprint 3 live acceptance workshop", { exact: true })
    .first()
    .click();
  const heading = page.getByRole("heading", {
    name: /Proposal · v\d+ · Draft/,
  });
  await expect(heading).toBeVisible();
  const currentVersion = Number(
    (await heading.innerText()).match(/v(\d+)/)![1],
  );
  const nextVersion = currentVersion + 1;
  const theme = page.getByRole("textbox", { name: "Theme", exact: true });
  const original = await theme.inputValue();
  await theme.fill("Browser-reviewed: " + original);
  await page.getByRole("button", { name: "Save new proposal version" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Proposal · v" + nextVersion + " · Draft",
    }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export latest saved (.txt)" })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    "proposal-v" + nextVersion + ".txt",
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString();
  expect(text).toContain("Browser-reviewed: " + original);
  expect(text).toContain("Status: Draft");
  expect(text).toContain("Version: " + nextVersion);
  await page.screenshot({
    path: "docs/previews/sprint3-live-workspace.png",
    fullPage: true,
  });
  await page
    .locator(".planning-panel")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: "docs/previews/sprint3-live-overview.png",
    fullPage: false,
  });
  await page.reload();
  await page
    .getByText("Sprint 3 live acceptance workshop", { exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Proposal · v" + nextVersion + " · Draft",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
