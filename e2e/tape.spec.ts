import { expect, test } from "@playwright/test";
import {
  dismissChangelog,
  focusTypingInput,
  passageMetrics,
  seedPrefs,
} from "./helpers";

test.describe("tape mode", () => {
  test("opens with the text centred and scrolls under a pinned caret", async ({
    page,
  }) => {
    await seedPrefs(page, { tapeMode: "letter", tapeMargin: 50 });
    await page.goto("/");
    await dismissChangelog(page);

    // At rest the caret (and first word) sits at the horizontal centre,
    // not the left edge.
    const atRest = await passageMetrics(page);
    expect(atRest.caretRatio).not.toBeNull();
    expect(atRest.caretRatio!).toBeGreaterThan(0.45);
    expect(atRest.caretRatio!).toBeLessThan(0.55);

    // Typing scrolls the line left while the caret holds at the centre.
    await focusTypingInput(page);
    await page.keyboard.type("the quick brown fox ", { delay: 8 });
    const afterTyping = await passageMetrics(page);
    expect(afterTyping.innerX).toBeLessThan(atRest.innerX); // line scrolled left
    expect(afterTyping.caretRatio!).toBeGreaterThan(0.42);
    expect(afterTyping.caretRatio!).toBeLessThan(0.58); // caret stays centred
  });

  test("applies the edge-fade opacity mask when fade is on", async ({ page }) => {
    await seedPrefs(page, { tapeMode: "letter", tapeMargin: 50, tapeFade: "strong" });
    await page.goto("/");
    await dismissChangelog(page);

    const mask = await page.evaluate(() => {
      const inner = [...document.querySelectorAll("div")].find((d) =>
        /translate3d/.test(d.getAttribute("style") || ""),
      );
      const vp = inner?.parentElement as HTMLElement | undefined;
      return vp ? getComputedStyle(vp).maskImage : null;
    });
    expect(mask).toContain("linear-gradient");
    // The browser normalises `transparent` to rgba(0, 0, 0, 0) in
    // computed style; the gradient fades to it at both ends.
    expect(mask).toContain("rgba(0, 0, 0, 0)");
  });
});
