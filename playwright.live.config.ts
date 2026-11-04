import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/live-e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5187",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    env: { VITE_APP_MODE: "supabase" },
    reuseExistingServer: false,
  },
});
