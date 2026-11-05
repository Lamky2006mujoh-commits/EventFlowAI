import { test, expect, type Page } from "@playwright/test";
const userId = "91000000-0000-4000-8000-000000000001";
const requestId = "92000000-0000-4000-8000-000000000001";
const agencyCode = "ABCDEF0123456789";
async function mockBackend(page: Page, role: "admin" | "member" = "admin") {
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "admin@example.com",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: {},
  };
  const queue: import("../../supabase/functions/_shared/contracts").SignupQueue =
    {
      registrationCode: agencyCode,
      pendingCount: 2,
      requests: [
        {
          id: requestId,
          name: "New Employee",
          email: "employee@example.com",
          status: "pending",
          emailConfirmed: true,
          createdAt: "2026-11-05T02:00:00Z",
          reviewedAt: null,
          reviewerName: null,
        },
        {
          id: "92000000-0000-4000-8000-000000000002",
          name: "Unconfirmed Employee",
          email: "waiting@example.com",
          status: "pending",
          emailConfirmed: false,
          createdAt: "2026-11-05T02:01:00Z",
          reviewedAt: null,
          reviewerName: null,
        },
      ],
    };
  let queueFailure = false;
  let workspaceFailure = false;
  let approved = false;
  const signupBodies: Array<Record<string, unknown>> = [];
  let pendingLogin = false;
  let rejected = false;
  const decisions: Array<Record<string, unknown>> = [];
  const saves: Array<Record<string, unknown>> = [];
  const additions: Array<Record<string, unknown>> = [];
  const savedBriefs: import("../../supabase/functions/_shared/contracts").Brief[] =
    [];
  await page.route("https://onboarding-test.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    const body = req.postDataJSON();
    const send = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (url.pathname.endsWith("/rest/v1/rpc/validate_agency_registration_code"))
      return send(body.p_code === agencyCode);
    if (url.pathname.endsWith("/signup")) {
      signupBodies.push(body);
      return send({ user: { ...user, email: body.email }, session: null });
    }
    if (url.pathname.endsWith("/token"))
      return send({
        access_token: "fixture-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "fixture-refresh-token",
        user,
      });
    if (url.pathname.endsWith("/user")) return send(user);
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith("/functions/v1/workspace")) {
      if (body.action === "save") {
        saves.push(body);
        const id = "95000000-0000-4000-8000-000000000001";
        const now = new Date().toISOString();
        savedBriefs.push({
          id,
          agencyId: "93000000-0000-4000-8000-000000000001",
          data: body.data,
          version: 1,
          updatedAt: now,
          author: "Review Admin",
          needsReview: false,
          history: [
            {
              version: 1,
              data: body.data,
              author: "Review Admin",
              createdAt: now,
            },
          ],
        });
        return send({ id });
      }
      if (body.action === "addMember") {
        additions.push(body);
        return send({ success: true });
      }
      if (body.action === "signupQueue")
        return queueFailure
          ? send({ error: "Signup notifications unavailable." }, 500)
          : send(queue);
      if (body.action === "reviewSignup") {
        decisions.push(body);
        const item = queue.requests.find((r) => r.id === body.requestId)!;
        item.status = body.decision === "approve" ? "approved" : "rejected";
        item.reviewedAt = new Date().toISOString();
        item.reviewerName = "Review Admin";
        queue.pendingCount--;
        approved = body.decision === "approve";
        rejected = body.decision === "reject";
        return send({ success: true });
      }
      if (body.action === "workspace") {
        if (workspaceFailure)
          return send({ error: "Workspace refresh unavailable." }, 500);
        if (pendingLogin)
          return send(
            {
              error: rejected
                ? "Your agency request was declined. Contact your agency administrator."
                : "Your registration is awaiting administrator approval.",
            },
            403,
          );
        return send({
          session: {
            id: userId,
            name: "Review Admin",
            agencyId: "93000000-0000-4000-8000-000000000001",
            agencyName: "Review Agency",
            role,
          },
          briefs: savedBriefs,
          members: [
            { id: userId, name: "Review Admin", role },
            ...(approved
              ? [
                  {
                    id: "94000000-0000-4000-8000-000000000001",
                    name: "New Employee",
                    role: "member",
                  },
                ]
              : []),
          ],
        });
      }
    }
    return send({ error: "Unexpected fixture request" }, 500);
  });
  return {
    queue,
    setQueueFailure: (value: boolean) => {
      queueFailure = value;
    },
    setWorkspaceFailure: (value: boolean) => {
      workspaceFailure = value;
    },
    signupBodies,
    decisions,
    saves,
    additions,
    pending: () => {
      pendingLogin = true;
    },
  };
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("registration routes the account without requesting a role and explains administrator approval", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "New team member? Create an account" })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("New Employee");
  await page.getByLabel("Email", { exact: true }).fill("employee@example.com");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page
    .getByRole("textbox", { name: "Agency code", exact: true })
    .fill(agencyCode);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("pending request");
  expect(backend.signupBodies).toHaveLength(1);
  expect(backend.signupBodies[0].data).toEqual({
    display_name: "New Employee",
    agency_code: agencyCode,
  });
  expect(backend.signupBodies[0]).not.toHaveProperty("role");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("admin notification leads to approval as Member and persisted review history after reload", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await login(page);
  await expect(
    page.getByRole("button", { name: "Review signup requests", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review signup requests", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Agency registration code" }),
  ).toHaveValue(agencyCode);
  await expect(
    page.getByRole("button", {
      name: "Approve Unconfirmed Employee",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Approve New Employee", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "grant Member access",
  );
  await page
    .getByRole("button", { name: "Confirm approval", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Member access saved" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Role for New Employee" }),
  ).toHaveValue("member");
  expect(backend.decisions).toEqual([
    { action: "reviewSignup", requestId, decision: "approve" },
  ]);
  await page.getByText("Signup review history (1)", { exact: true }).click();
  await expect(page.locator(".signup-history")).toContainText(
    "Approved as Member by Review Admin",
  );
  await page.reload();
  await page.getByRole("button", { name: /Members & roles/ }).click();
  await page.getByText("Signup review history (1)", { exact: true }).click();
  await expect(page.locator(".signup-history")).toContainText(
    "Approved as Member by Review Admin",
  );
  await page.locator(".signup-review").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("signup-approval-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath("signup-approval-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("rejection is saved without membership; member cannot see approval UI", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await login(page);
  await page
    .getByRole("button", { name: "Review signup requests", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reject New Employee", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Decision saved" }),
  ).toBeVisible();
  expect(backend.decisions[0]).toEqual({
    action: "reviewSignup",
    requestId,
    decision: "reject",
  });
  await expect(
    page.getByRole("combobox", { name: "Role for New Employee" }),
  ).toHaveCount(0);
});
test("confirmed pending login stays outside workspace with a useful message", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  backend.pending();
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "awaiting administrator approval",
  );
  await expect(
    page.getByRole("heading", { name: "Welcome to your workspace." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
});
test("ordinary members cannot see signup notifications or the review queue", async ({
  page,
}) => {
  await mockBackend(page, "member");
  await login(page);
  await page.getByRole("button", { name: /Members & roles/ }).click();
  await expect(
    page.getByRole("region", { name: "Signup requests" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review signup requests", exact: true }),
  ).toHaveCount(0);
});

test("notification failures are visible and an explicit refresh recovers", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  backend.setQueueFailure(true);
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Signup notifications unavailable",
  );
  await page.getByRole("button", { name: /Members & roles/ }).click();
  await expect(
    page.getByRole("region", { name: "Signup requests" }).getByRole("alert"),
  ).toContainText("Signup notifications unavailable");
  backend.setQueueFailure(false);
  await page
    .getByRole("button", { name: "Refresh signup requests", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve New Employee", exact: true }),
  ).toBeVisible();
});
test("admin pending count refreshes automatically while signed in", async ({
  page,
}) => {
  await page.clock.install();
  const backend = await mockBackend(page);
  await login(page);
  await expect(
    page.getByRole("status").filter({ hasText: "2 new signup requests" }),
  ).toBeVisible();
  backend.queue.pendingCount = 3;
  await page.clock.runFor(30000);
  await expect(
    page.getByRole("status").filter({ hasText: "3 new signup requests" }),
  ).toBeVisible();
});

test("wrong agency code does not create an account", async ({ page }) => {
  const backend = await mockBackend(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "New team member? Create an account" })
    .click();
  await page.getByLabel("Full name", { exact: true }).fill("New Employee");
  await page.getByLabel("Email", { exact: true }).fill("employee@example.com");
  await page.getByLabel("Password", { exact: true }).fill("long-test-password");
  await page
    .getByRole("textbox", { name: "Agency code", exact: true })
    .fill("FFFFFFFFFFFFFFFF");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Invalid agency code");
  expect(backend.signupBodies).toHaveLength(0);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "long-test-password",
  );
});

test("admin overview lists pending names and emails without searching", async ({
  page,
}) => {
  await mockBackend(page);
  await login(page);
  const list = page.getByRole("region", { name: "Pending signup applicants" });
  await expect(list.getByText("New Employee", { exact: true })).toBeVisible();
  await expect(
    list.getByText("employee@example.com", { exact: true }),
  ).toBeVisible();
  await expect(
    list.getByText("waiting@example.com", { exact: true }),
  ).toBeVisible();
  await expect(
    list.getByText("Waiting for email confirmation", { exact: true }),
  ).toBeVisible();
  await list
    .getByRole("button", { name: "Review all signup requests" })
    .click();
  const review = page.getByRole("region", { name: "Signup requests" });
  await expect(
    review.getByText("employee@example.com", { exact: true }),
  ).toBeVisible();
  await expect(review.getByLabel("Search signup requests")).toBeHidden();
  await expect(
    review.getByRole("button", { name: "Approve New Employee", exact: true }),
  ).toBeEnabled();
});

test("admin overview explains an empty pending list", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  backend.queue.pendingCount = 0;
  backend.queue.requests = [];
  await login(page);
  await expect(
    page.getByRole("region", { name: "Pending signup applicants" }),
  ).toContainText("No one is waiting to join this agency");
});

test("signup search and confirmation filters preserve the full pending count", async ({
  page,
}) => {
  await mockBackend(page);
  await login(page);
  await page.getByRole("button", { name: /Members & roles/ }).click();
  const region = page.getByRole("region", { name: "Signup requests" });
  await expect(region.locator(".signup-request")).toHaveCount(2);
  await region
    .getByText("Search or filter applicants", { exact: true })
    .click();
  await region.getByLabel("Filter pending requests").selectOption("confirmed");
  await expect(region.locator(".signup-request")).toHaveCount(1);
  await expect(
    region.getByRole("button", { name: "Approve New Employee", exact: true }),
  ).toBeVisible();
  await region.getByLabel("Search signup requests").fill("WAITING@EXAMPLE.COM");
  await expect(
    region.getByText("No pending requests match your filters."),
  ).toBeVisible();
  await region
    .getByLabel("Filter pending requests")
    .selectOption("unconfirmed");
  await expect(region.locator(".signup-request")).toHaveCount(1);
  await expect(
    region.getByRole("button", {
      name: "Approve Unconfirmed Employee",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(region.getByRole("status")).toContainText(
    "2 pending signup requests",
  );
});

test("successful approval closes confirmation even when workspace refresh fails", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await login(page);
  await page.getByRole("button", { name: /Members & roles/ }).click();
  await page
    .getByRole("button", { name: "Approve New Employee", exact: true })
    .click();
  backend.setWorkspaceFailure(true);
  await page
    .getByRole("button", { name: "Confirm approval", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Workspace refresh unavailable",
  );
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(backend.decisions).toHaveLength(1);
  await expect(
    page.getByRole("region", { name: "Signup requests" }).getByRole("status"),
  ).toContainText("1 pending signup request");
});

test("committed brief stays saved when refresh fails and recovery cannot submit it twice", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await login(page);
  await page.getByRole("button", { name: "New brief", exact: true }).click();
  await page.getByLabel("Event name").fill("Demo recovery brief");
  await page.getByLabel("Client / organization").fill("Synthetic client");
  await page.getByLabel("Event date").fill("2026-11-28");
  await page.getByLabel("Venue / proposed location").fill("TP.HCM");
  await page
    .getByLabel("Event objectives")
    .fill("Verify a safe recovery after a committed save.");
  backend.setWorkspaceFailure(true);
  await page.getByRole("button", { name: "Create brief", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Client briefs", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Brief created successfully" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Workspace refresh unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Create brief", exact: true }),
  ).toHaveCount(0);
  expect(backend.saves).toHaveLength(1);
  backend.setWorkspaceFailure(false);
  await page
    .getByRole("button", { name: "Refresh workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Demo recovery brief", exact: true }),
  ).toBeVisible();
  expect(backend.saves).toHaveLength(1);
});

test("committed member addition clears the form even if refresh fails", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await login(page);
  await page.getByRole("button", { name: /Members & roles/ }).click();
  await page.getByLabel("Member name", { exact: true }).fill("Legacy Member");
  await page
    .getByLabel("Registered email", { exact: true })
    .fill("legacy@example.com");
  backend.setWorkspaceFailure(true);
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Workspace refresh unavailable",
  );
  await expect(page.getByLabel("Member name", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Registered email", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("status").filter({ hasText: "Legacy Member was added" }),
  ).toBeVisible();
  expect(backend.additions).toHaveLength(1);
});

test("brief fields freeze during a pending save and retain the submitted snapshot", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  let releaseSave: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route(
    "https://onboarding-test.supabase.co/functions/v1/workspace",
    async (route) => {
      if (route.request().postDataJSON().action === "save") await gate;
      await route.fallback();
    },
  );
  await login(page);
  await page.getByRole("button", { name: "New brief", exact: true }).click();
  const title = page.getByLabel("Event name");
  await title.fill("Submitted snapshot");
  await page.getByLabel("Client / organization").fill("Synthetic client");
  await page.getByLabel("Event date").fill("2026-11-28");
  await page.getByLabel("Venue / proposed location").fill("TP.HCM");
  await page
    .getByLabel("Event objectives")
    .fill("Protect the submitted values during a slow save.");
  await page.getByRole("button", { name: "Create brief", exact: true }).click();
  await expect(title).toBeDisabled();
  await expect(page.getByLabel("Event date")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Refresh workspace", exact: true }),
  ).toBeDisabled();
  releaseSave();
  await expect(
    page.getByRole("heading", { name: "Submitted snapshot", exact: true }),
  ).toBeVisible();
  expect(backend.saves).toHaveLength(1);
  expect((backend.saves[0].data as { title: string }).title).toBe(
    "Submitted snapshot",
  );
});
