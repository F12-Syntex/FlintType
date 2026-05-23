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

/** The race passage's target words, read straight off the DOM. The
 *  passage inner block always carries a `translate3d(...)` transform
 *  (vertical/horizontal scroll), and each word span renders a trailing
 *  space — so the block's textContent is "word1 word2 …", split on
 *  whitespace. Read this once the race is *racing* (the active word is
 *  word 0, the rest render as raw text) for the full passage. */
export async function racePassageWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const inner = [...document.querySelectorAll("div")].find((d) =>
      /translate3d/.test(d.getAttribute("style") || ""),
    );
    if (!inner) return [];
    return (inner.textContent || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  });
}

/** Type the whole race passage correctly to completion, then wait for
 *  the finished state (the "Race again" CTA, which only appears at
 *  phase === "finished"). Extracts the words first, then types them
 *  with single spaces + a trailing space so the final word commits. */
export async function finishRace(page: Page): Promise<void> {
  const words = await racePassageWords(page);
  if (words.length === 0) {
    throw new Error("could not read the race passage words from the DOM");
  }
  await focusTypingInput(page);
  // 45ms/char ≈ 265 gross WPM — fast, but under the server's 500-WPM
  // keystroke cap (the client publishes gross WPM since the gun, and
  // anything over 500 is rejected as superhuman). Typing at a human
  // speed means the authority actually records the progress + finish,
  // so a bot-less race resolves to its finished state. Trailing space
  // commits the last word.
  await page.keyboard.type(`${words.join(" ")} `, { delay: 45 });
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
  groupGapAbove: number;
}> {
  return page.evaluate(() => {
    const inner = [...document.querySelectorAll("div")].find((d) =>
      /translate3d/.test(d.getAttribute("style") || ""),
    );
    if (!inner)
      return { innerX: NaN, caretRatio: null, gapAbove: NaN, gapBelow: NaN, groupGapAbove: NaN };
    const viewport = inner.parentElement as HTMLElement;
    const outer = viewport.parentElement as HTMLElement;
    const oR = outer.getBoundingClientRect();
    const vR = viewport.getBoundingClientRect();
    // The centred group is [optional readouts slot, viewport]. Its top is
    // the outer's first child — the readouts when present, else the
    // viewport itself. `groupGapAbove` is the space above that group, so
    // it ≈ `gapBelow` when the whole group is vertically centred.
    const first = (outer.firstElementChild as HTMLElement | null) ?? viewport;
    const groupGapAbove = first.getBoundingClientRect().top - oR.top;
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
      groupGapAbove,
    };
  });
}
