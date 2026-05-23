import type { Page } from "@playwright/test";

/** Seed the prefs blob in localStorage *before* the app's JS runs, so
 *  the first paint already reflects the chosen appearance. Must be called
 *  before `page.goto`. */
export async function seedPrefs(
  page: Page,
  appearance: Record<string, unknown>,
  practice: Record<string, unknown> = {
    mode: "WORDS",
    length: 25,
    adapt: false,
    wordlist: "english",
  },
): Promise<void> {
  await page.addInitScript(
    ([app, prac]) => {
      window.localStorage.setItem(
        "flinttype:prefs:v1",
        JSON.stringify({ appearance: app, behaviour: {}, practice: prac }),
      );
    },
    [appearance, practice] as const,
  );
}

/** The first-visit "What's new" changelog dialog covers the surface;
 *  dismiss it if present. Tolerant — does nothing when it's absent. */
export async function dismissChangelog(page: Page): Promise<void> {
  const got = page.getByRole("button", { name: "Got it" });
  if (await got.count()) {
    await got.first().click({ timeout: 3_000 }).catch(() => {});
  }
}

/** Focus the hidden typing input so `page.keyboard` lands on it. */
export async function focusTypingInput(page: Page): Promise<void> {
  await page.evaluate(() => {
    const inp = document.querySelector<HTMLInputElement>(
      'input[aria-label="Typing input"]',
    );
    inp?.focus();
  });
}

/** Largest racer-lane progress-bar fill width (%), 0 when nobody has
 *  advanced. The race lane fills are the only `rounded-full` elements
 *  with an inline `width: N%` on the race screen (the friends dock,
 *  which also uses avatars, is hidden during a race). */
export async function maxLaneWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const widths = [...document.querySelectorAll('[class*="rounded-full"][style*="width"]')]
      .map((e) => parseFloat((e.getAttribute("style") || "").match(/width:\s*([0-9.]+)%/)?.[1] || "0"))
      .filter((n) => !Number.isNaN(n));
    return widths.length ? Math.max(...widths) : 0;
  });
}

/** True while the big 3/2/1 countdown digit is on screen. */
export async function countdownVisible(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    [...document.querySelectorAll("div,span,p")].some((e) => {
      const t = (e.textContent || "").trim();
      return (
        /^(3|2|1)$/.test(t) &&
        parseFloat(getComputedStyle(e).fontSize || "0") > 50 &&
        e.getBoundingClientRect().width > 0
      );
    }),
  );
}

/** Geometry of the passage: the inner block's X translate, the caret's
 *  horizontal position as a 0–1 ratio of the viewport, and the vertical
 *  gaps above/below the clipped viewport within its (centred) box. */
export async function passageMetrics(page: Page): Promise<{
  innerX: number;
  caretRatio: number | null;
  gapAbove: number;
  gapBelow: number;
}> {
  return page.evaluate(() => {
    const inner = [...document.querySelectorAll("div")].find((d) =>
      /translate3d/.test(d.getAttribute("style") || ""),
    );
    if (!inner) return { innerX: NaN, caretRatio: null, gapAbove: NaN, gapBelow: NaN };
    const viewport = inner.parentElement as HTMLElement;
    const outer = viewport.parentElement as HTMLElement;
    const oR = outer.getBoundingClientRect();
    const vR = viewport.getBoundingClientRect();
    const m = getComputedStyle(inner).transform.match(/matrix\(([^)]+)\)/);
    const innerX = m ? parseFloat(m[1]!.split(",")[4]!) : 0;
    const caret = [...inner.querySelectorAll("span")].find((s) => {
      const st = getComputedStyle(s);
      return st.position === "absolute" && st.pointerEvents === "none";
    });
    const cR = caret?.getBoundingClientRect();
    return {
      innerX,
      caretRatio: cR ? (cR.left + cR.width / 2 - oR.left) / oR.width : null,
      gapAbove: vR.top - oR.top,
      gapBelow: oR.bottom - vR.bottom,
    };
  });
}
