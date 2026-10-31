import { defineConfig } from "@playwright/test";

/** UI walkthrough against a running stack (default http://localhost:8000). Uses the installed Chrome. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8000",
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    trace: "off",
  },
});
