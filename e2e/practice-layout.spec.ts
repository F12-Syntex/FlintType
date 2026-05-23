import { expect, test } from "@playwright/test";
import { dismissChangelog, passageMetrics } from "./helpers";

test.describe("practice layout defaults", () => {
  test("the typing text is vertically centred in its area", async ({ page }) => {
    await page.goto("/");
    await dismissChangelog(page);

    const m = await passageMetrics(page);
    // The clipped viewport floats in the middle of its box: the gap
    // above it equals the gap below it (within a pixel of rounding).
    expect(Math.abs(m.gapAbove - m.gapBelow)).toBeLessThan(4);
    expect(m.gapAbove).toBeGreaterThan(8); // genuinely centred, not pinned to the top
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
