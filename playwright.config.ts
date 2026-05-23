import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests. These drive the real app in a browser — the layer
 *  the unit suite (vitest) deliberately doesn't cover, since React
 *  components are validated in the browser (docs/ui-law.md §1.3). They
 *  exist for the flows that have bitten us in a real browser but can't
 *  be asserted from a pure unit: the race countdown input lock, tape
 *  mode pinning/scrolling, the centred passage layout.
 *
 *  Run with `yarn e2e` (headless) or `yarn e2e:headed`. A dev server is
 *  started on a dedicated port (3100) so it never collides with a dev
 *  server you already have running on 3000/3001; `reuseExistingServer`
 *  lets you point it at an already-running 3100 during local iteration. */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The race tests walk a real ~6s matchmaking → countdown → racing
  // lifecycle, so give each test generous headroom.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    // The hidden typing input is 1px / opacity-0; don't let Playwright's
    // visibility checks block interaction with it.
    actionTimeout: 15_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } } },
  ],
  webServer: {
    command: `yarn dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
