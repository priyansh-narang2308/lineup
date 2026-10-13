import { expect, test } from "@playwright/test";

/**
 * Failure states, simulated against OUR app only (route interception of the
 * same-origin proxy, or the ?simulate= lab). The organisers' API is never stressed.
 */

test("server error on refresh keeps the snapshot and shows a stale banner with retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/events", (route) =>
    fail ? route.fulfill({ status: 503, body: "Service Unavailable" }) : route.continue(),
  );
  await page.goto("/events");
  await expect(page.getByText("Live update failed")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("article").first()).toBeVisible(); // still usable
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Live update failed")).toBeHidden();
});

test("malformed (HTML) response is rejected, not rendered", async ({ page }) => {
  await page.route("**/api/events", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html>oops</html>" }));
  await page.goto("/events");
  await expect(page.getByText(/couldn’t read|unexpected format/)).toBeVisible({ timeout: 15_000 });
});

test("empty dataset shows an honest empty state", async ({ page }) => {
  await page.route("**/api/events", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [], invalid: 0, fetchedAt: Date.now() }) }),
  );
  await page.goto("/events");
  await expect(page.getByText("No events published yet")).toBeVisible({ timeout: 15_000 });
});

test("simulated outage with no snapshot shows a full error panel and recovers", async ({ page }) => {
  await page.goto("/events?simulate=error");
  await expect(page.getByRole("main").getByText("Reliability lab")).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("We couldn’t load events", { timeout: 15_000 });
  await page.getByRole("link", { name: "Exit" }).click();
  await expect(page.locator("article").first()).toBeVisible();
});

test("simulated timeout and offline states have specific copy", async ({ page }) => {
  await page.goto("/events?simulate=timeout");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("taking longer than usual", { timeout: 20_000 });
  await page.goto("/events?simulate=offline");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("You’re offline", { timeout: 15_000 });
});

test("slow network shows skeletons while loading", async ({ page }) => {
  await page.goto("/events?simulate=slow");
  await expect(page.locator("[aria-busy=true]")).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });
});

test("invalid event id deep link shows not-found inside the drawer", async ({ page }) => {
  await page.goto("/events?e=00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("dialog")).toContainText("That event doesn’t exist", { timeout: 15_000 });
});

test("detail failure keeps the summary and offers retry", async ({ page }) => {
  await page.route("**/api/events/*", (route) => route.abort("internetdisconnected"));
  await page.goto("/events");
  await page.locator("article h3 button").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("article").getByRole("heading", { level: 2 })).toBeVisible();
  await expect(dialog.getByText(/Showing the summary only/)).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();
});
