import { expect, test } from "@playwright/test";
import { dismissChangelog, passageMetrics } from "./helpers";

test.describe("practice layout defaults", () => {
  test("the readouts + typing text are vertically centred as one group", async ({ page }) => {
    await page.goto("/");
    await dismissChangelog(page);

    const m = await passageMetrics(page);
    // The live readouts ride directly above the text, and the whole
    // {readouts + text} group floats in the middle of its box: the gap
    // above the readouts equals the gap below the text. (The text
    // viewport itself sits just below centre because the readouts take
    // the top of the group — that's intended, so we check the *group*,
    // not the viewport.)
    expect(Math.abs(m.groupGapAbove - m.gapBelow)).toBeLessThan(6);
    expect(m.groupGapAbove).toBeGreaterThan(8); // genuinely centred, not pinned to the top
    // The readouts sit above the text within the group: the viewport's
    // own top gap is larger than the group's (it's pushed down by the
    // readouts slot).
    expect(m.gapAbove).toBeGreaterThan(m.groupGapAbove);
  });

  test("the on-screen keyboard renders at the smaller default scale", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissChangelog(page);

    const style = await page.evaluate(() => {
      const kb = document.querySelector('[aria-label*="virtual keyboard"]');
      return kb ? kb.getAttribute("style") || "" : null;
    });
    expect(style).toContain("scale(0.8)");
  });
});
