import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 768, 1024, 1280, 1440];

for (const path of ["/", "/events", "/events?view=timeline"]) {
  for (const width of widths) {
    test(`${path} has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("mobile filter sheet opens and applies squad size", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/events");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await sheet.getByRole("radio", { name: "Solo" }).click();
  await sheet.getByRole("button", { name: /^Show \d+ events?/ }).click();
  await expect(sheet).toBeHidden();
  const cards = await page.locator("article").allTextContents();
  expect(cards.length).toBeGreaterThan(0);
  for (const text of cards) expect(text).toMatch(/Solo/);
});
