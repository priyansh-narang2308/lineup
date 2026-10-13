// Full-page responsive screenshots for visual QA.
// Usage: node scripts/shots.mjs <baseUrl> <outDir> [path ...]
import { chromium } from "@playwright/test";

const [base = "http://localhost:3200", out = "./.shots", ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ["/"];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const route of routes) {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    await page.goto(base + route, { waitUntil: "networkidle" });
    // Trigger lazy images, then return to top.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const slug = route.replace(/[^a-z0-9]+/gi, "_") || "root";
    await page.screenshot({ path: `${out}/${slug}-${vp.name}.png`, fullPage: true });
    console.log(`${route} @${vp.name}: horizontal overflow ${overflow}px`);
    await page.close();
  }
}
await browser.close();
