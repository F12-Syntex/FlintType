import { existsSync, mkdirSync } from "node:fs";
import { test as setup, type Page } from "@playwright/test";
import { dismissChangelog } from "../e2e/helpers";
import { provisionPersonas } from "./clerk-admin";
import { CLERK_TEST_CODE, PERSONAS, STORAGE_DIR, storageStatePath } from "./personas";

// Provision the persona accounts via Clerk's Backend API (create-or-reset),
// then sign each one in through the real UI funnel and snapshot the session
// to sim/.auth/<id>.json for the social-loop spec to reuse.
//
// Serial: the dev instance can rate-limit a burst of parallel auth calls.
setup.describe.configure({ mode: "serial" });

setup.beforeAll(async () => {
  if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });
  await provisionPersonas();
});

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await dismissChangelog(page);
  // The email-stage "Continue" button is NOT gated on Clerk's isLoaded
  // (only on busy), so clicking before Clerk finishes loading silently
  // no-ops and the funnel never advances. Wait for Clerk first.
  await page.waitForFunction(
    () => (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
    { timeout: 30_000 },
  );
  // 1. email funnel
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /^continue$/i }).click();
  // 2. method picker → email code. Password-only sign-in is rejected
  //    ("additional verification required") because Backend-API-created
  //    users have unverified emails; the email-code factor accepts the
  //    fixed test code for +clerk_test addresses, so use that instead.
  await page.getByRole("button", { name: /email me a code/i }).click();
  // 3. 6-digit code (input-otp auto-submits onComplete)
  const otp = page.getByLabel("Verification code");
  await otp.click();
  await otp.pressSequentially(CLERK_TEST_CODE, { delay: 40 });
  // success → router.push("/"); treat "left the auth pages" as signed-in.
  await page.waitForURL((url) => !/\/sign-(in|up)/.test(url.pathname), {
    timeout: 30_000,
  });
}

for (const persona of PERSONAS) {
  setup(`authenticate ${persona.id}`, async ({ page }) => {
    await signIn(page, persona.email, persona.password);
    await page.context().storageState({ path: storageStatePath(persona.id) });
  });
}
