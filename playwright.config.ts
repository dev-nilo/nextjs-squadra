import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

/**
 * E2E runs against a production build (`next start`) talking to a local Supabase
 * started with `npm run db:start` (migrations + supabase/seed.sql). Never point it at
 * staging or production: the tests create and delete Jogadores.
 */
export default defineConfig({
  testDir: "./e2e",
  // The specs share one seeded database, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/auth`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
