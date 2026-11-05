import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/onboarding-e2e",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5189",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5189 --strictPort",
    url: "http://127.0.0.1:5189",
    env: {
      VITE_APP_MODE: "supabase",
      VITE_SUPABASE_URL: "https://onboarding-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_onboarding_test_fixture",
    },
    reuseExistingServer: false,
  },
});
