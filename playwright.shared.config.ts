import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/shared-backend-e2e",
  outputDir: "./test-results/shared-backend",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5190",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "node scripts/start-shared-fixture.mjs",
    url: "http://127.0.0.1:5190",
    reuseExistingServer: false,
  },
});
