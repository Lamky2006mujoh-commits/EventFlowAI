import { test, expect } from "@playwright/test";
import { sharedBackend } from "../../src/lib/shared-backend";
import { emptyPlanning } from "../../supabase/functions/_shared/planning";
import { demoVenueSearch } from "../../src/lib/demo-venues";

test("fresh clone routes login, concept generation and venue search to the shared Supabase project", async ({
  page,
}) => {
  const userId = "98000000-0000-4000-8000-000000000001";
  const briefId = "98000000-0000-4000-8000-000000000002";
  const agencyId = "98000000-0000-4000-8000-000000000003";
  const now = new Date().toISOString();
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {},
    email_confirmed_at: now,
  };
  const data = {
    title: "Shared backend fixture",
    client: "Synthetic client",
    eventType: "Workshop" as const,
    date: "2026-11-28",
    venue: "TP.HCM",
    attendees: 80,
    budget: 100000000,
    objectives: "Verify shared endpoint routing without any environment setup.",
    audience: "Planners",
    constraints: "",
  };
  const state = emptyPlanning(1);
  const requests: string[] = [];
  await page.route(sharedBackend.url + "/**", async (route) => {
    const request = route.request();
    expect(request.headers().apikey).toBe(sharedBackend.key);
    const path = new URL(request.url()).pathname;
    const send = (value: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    if (path.endsWith("/token")) {
      requests.push("login");
      return send({
        access_token: "fixture-token",
        refresh_token: "fixture-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    const body = request.postDataJSON();
    if (path.endsWith("/functions/v1/workspace")) {
      requests.push(body.action);
      return send({
        session: {
          id: userId,
          name: "Fixture Member",
          agencyId,
          agencyName: "Fixture agency",
          role: "member",
        },
        members: [{ id: userId, name: "Fixture Member", role: "member" }],
        briefs: [
          {
            id: briefId,
            agencyId,
            data,
            version: 1,
            updatedAt: now,
            author: "Fixture Member",
            needsReview: false,
            history: [
              { version: 1, data, author: "Fixture Member", createdAt: now },
            ],
          },
        ],
      });
    }
    if (path.endsWith("/functions/v1/planning")) {
      requests.push(body.action);
      if (body.action === "generateConcepts") {
        state.concepts = [4, 5].map((i) => ({
          id: `98000000-0000-4000-8000-00000000000${i}`,
          title: "Fixture concept " + i,
          theme: "Sample theme",
          activities: ["Welcome"],
          assumptions: ["Sample, not live generation"],
        }));
        state.revision++;
      } else if (body.action === "searchVenues") {
        state.venueSearch = demoVenueSearch({ version: 1, data });
        state.revision++;
      }
      return send(state);
    }
    return route.fulfill({
      status: 500,
      body: "Unexpected shared-backend fixture request",
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to your workspace." }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.com");
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByText("Shared backend fixture", { exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Generate concepts", exact: true })
    .click();
  await expect(page.locator(".concept-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Find venues on the web", exact: true })
    .click();
  await expect(page.locator(".venue-card")).toHaveCount(3);
  // React development StrictMode may repeat the initial planning read.
  expect([...new Set(requests)]).toEqual([
    "login",
    "workspace",
    "load",
    "generateConcepts",
    "searchVenues",
  ]);
});
