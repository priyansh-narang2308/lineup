import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test("landing renders live data, hero and working CTAs", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your fest, without the clashes/);
  await expect(page.getByText(/\d+ events · /).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /things happen at once/ })).toBeVisible();
  await page.getByRole("link", { name: "Build your lineup" }).first().click();
  await expect(page).toHaveURL(/\/events/);
  await expect(page.getByRole("heading", { level: 1, name: "Events" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("search and filters narrow results and sync to the URL", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("searchbox", { name: "Search events" }).fill("robot");
  await expect(page).toHaveURL(/q=robot/);
  await expect(page.locator("article")).not.toHaveCount(0);
  for (const title of await page.locator("article h3").allInnerTexts()) {
    expect(title.toLowerCase()).toMatch(/robot|drone|arduino|line-follower|wear|track/);
  }
  await page.getByRole("searchbox", { name: "Search events" }).fill("zzzz-nothing");
  await expect(page.getByText("No events match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("article").first()).toBeVisible();
});

test("lineup: add events, see a real clash, persist across reload", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("button", { name: /^Add Seed Stage/ }).click();
  // Ampersand (Sat 15:00–21:00) overlaps Seed Stage (Sat 10:00–17:00) by 2h
  const amp = page.locator("article", { hasText: "Ampersand" });
  await expect(amp.getByText(/Overlaps Seed Stage for 2h/)).toBeVisible();
  await amp.getByRole("button", { name: /Add Ampersand/ }).click();
  await expect(page.getByRole("button", { name: /Open your lineup: 2 events, 1 clashes/ })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Open your lineup/ }).click();
  const panel = page.getByRole("dialog", { name: "Your lineup" });
  await expect(panel.getByText(/overlaps/)).toContainText("2h");
  await expect(panel.getByRole("button", { name: "Add to calendar" })).toBeEnabled();
});

test("detail drawer: opens from a card, deep links, closes with Escape and Back", async ({ page }) => {
  await page.goto("/events");
  await page.locator("article h3 button").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/[?&]e=[0-9a-f-]{36}/);
  await expect(dialog.getByText("About")).toBeVisible({ timeout: 10_000 });
  const url = page.url();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/[?&]e=/);

  await page.goto(url);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("timeline view shows days with lineup legend", async ({ page }) => {
  await page.goto("/events?view=timeline");
  await expect(page.getByRole("heading", { name: /Saturday/ })).toBeVisible();
  await expect(page.getByText("Clashes with your lineup")).toBeVisible();
});

test("desktop dropdowns: filter, sort and removable chips", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/events");
  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Free events" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/free=1/);
  await expect(page.getByRole("button", { name: "Remove filter: Free" })).toBeVisible();

  await page.getByRole("button", { name: /^Sort by/ }).click();
  await page.getByRole("menuitemradio", { name: "Lowest price" }).click();
  await expect(page).toHaveURL(/sort=price/);

  await page.getByRole("button", { name: "Remove filter: Free" }).click();
  await expect(page).not.toHaveURL(/free=1/);
});
