import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3300);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    channel: process.env.E2E_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  // Runs against a production build. Set E2E_BASE_URL to test a deployment instead.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `pnpm start -p ${PORT}`, url: BASE_URL, reuseExistingServer: true, timeout: 60_000 },
});
