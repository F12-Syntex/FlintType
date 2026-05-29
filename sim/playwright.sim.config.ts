import { defineConfig, devices } from "@playwright/test";

// Drives the ISOLATED prod snapshot on :3100 (built + served with
// DATABASE_MODE=pglite, Neon untouched). Unlike the committed e2e config,
// this one does NOT start a webServer — the snapshot is launched
// separately (Next 16 forbids a second dev server while :3000 runs, so we
// run `next start -p 3100` out of band and point at it here).
const BASE_URL = "http://localhost:3100";

export default defineConfig({
  testDir: ".",
  // Sign-up funnels, multi-racer countdowns and ready-up handshakes are
  // slow; give each test real headroom.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  // The social-loop spec coordinates several users inside ONE test (one
  // process, multiple browser contexts), so cross-test parallelism stays
  // off — a race needs everyone in the same room at the same time.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../.sim-report" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
    {
      // No `dependencies: ["setup"]` — the saved sessions in sim/.auth/
      // persist, so the sim reruns instantly off disk. Run `--project setup`
      // on demand (with CLERK_SECRET_KEY exported) to (re)mint sessions.
      name: "sim",
      testMatch: /\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
  ],
});
