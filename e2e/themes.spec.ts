import { expect, test } from "@playwright/test";
import { dismissChangelog } from "./helpers";

/** The computed `--primary` custom property on <html> — the brand spark.
 *  Custom properties aren't normalised to rgb(), so this reads back the
 *  authored value (the :root hex at Default, a theme's oklch when one is
 *  active). */
function primaryVar(p: import("@playwright/test").Page): Promise<string> {
  return p.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim(),
  );
}

test.beforeEach(async ({ page }) => {
  // Skip the theme-switch confirm dialog so a pick applies directly (no
  // export prompt, no dialog to drive). Browser-persistent UX nudge —
  // safe to force in a test.
  await page.addInitScript(() => {
    window.localStorage.setItem("ft-theme-skip-confirm", "1");
  });
});

test("the default theme is a TRUE default — picker reads Default, primary is the brand orange", async ({
  page,
}) => {
  await page.goto("/customise/appearance");
  await dismissChangelog(page);

  // The theme picker reads "Default" on a fresh account, NOT "Custom".
  // (The bug: the orange was force-applied as an override + palette
  // pinned to "custom", so a fresh account read as customised.)
  const trigger = page.getByRole("button", { name: "Pick a theme" });
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await expect(trigger).toContainText(/default/i);
  await expect(trigger).not.toContainText(/custom/i);

  // Primary is the brand orange, coming from :root (not an override).
  const primary = (await primaryVar(page)).toLowerCase().replace(/\s+/g, "");
  expect(primary === "#f97316" || primary.includes("249")).toBe(true);
});

test("the Primary accent row offers no Reset at default (reset only appears once overridden)", async ({
  page,
}) => {
  await page.goto("/customise/appearance");
  await dismissChangelog(page);

  // The Primary accent colour row's picker shows "Default" and there's
  // no Reset affordance until the user actually overrides it. (The bug:
  // a permanent baked override meant Primary always showed Reset.)
  const pickPrimary = page.getByRole("button", { name: "Pick Primary accent" });
  await expect(pickPrimary).toBeVisible({ timeout: 10_000 });
  await expect(pickPrimary).toContainText(/default/i);
});

test("picking a theme changes the colours; Default restores them", async ({
  page,
}) => {
  await page.goto("/customise/appearance");
  await dismissChangelog(page);
  await expect(page.getByRole("button", { name: "Pick a theme" })).toContainText(
    /default/i,
    { timeout: 10_000 },
  );
  const def = await primaryVar(page);
  expect(def.length).toBeGreaterThan(0);

  // Pick a community palette → the primary changes.
  await page.getByRole("button", { name: "Pick a theme" }).click();
  await page.getByRole("menuitem", { name: /catppuccin/i }).click();
  await expect
    .poll(() => primaryVar(page), { timeout: 10_000 })
    .not.toBe(def);
  // The picker now reflects the active palette, not "Default".
  await expect(
    page.getByRole("button", { name: "Pick a theme" }),
  ).toContainText(/catppuccin/i);

  // Back to Default restores the original primary exactly.
  await page.getByRole("button", { name: "Pick a theme" }).click();
  await page.getByRole("menuitem", { name: /default/i }).click();
  await expect
    .poll(() => primaryVar(page), { timeout: 10_000 })
    .toBe(def);
  await expect(
    page.getByRole("button", { name: "Pick a theme" }),
  ).toContainText(/default/i);
});
