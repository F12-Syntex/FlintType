/** Curated Google Fonts available in the typography picker.
 *
 *  Every face listed here is shipped locally under public/fonts/. The
 *  binaries are downloaded ahead of time by `yarn fonts:download` (which
 *  reads `cssHref` below, fetches Google's CSS2 endpoint, and rewrites
 *  the @font-face urls to point at public/fonts/<id>/*.woff2). The root
 *  layout then loads /fonts/fonts.css once, so the picker only has to
 *  flip a CSS variable — no runtime fetch, no preconnect, no failure
 *  mode when a network is locked down or Google is blocked.
 *
 *  `cssHref` therefore exists for the build script alone; nothing in the
 *  app reads it at runtime. Keeping it here keeps the script and the
 *  catalog single-sourced.
 *
 *  The catalog is hand-curated for typing practice: monospaces are
 *  plentiful (typing-test bread and butter), sans/serif are kept short
 *  to taste rather than exhaustive. */

export type FontCategory = "mono" | "sans" | "serif";

export type FontEntry = {
  /** URL-safe id; used as the DOM id of the injected <link> tag. */
  id: string;
  /** CSS family name (the value Google publishes). */
  family: string;
  category: FontCategory;
  /** fonts.googleapis.com css2 URL — one family per entry so each font's
   *  woff2 is downloaded only when first rendered (the browser doesn't
   *  fetch woff2s for CSS rules that never match a painted span). */
  cssHref: string;
  /** Full CSS font-family stack, including a generic fallback so the
   *  passage never goes blank if the Google fetch fails or is blocked. */
  stack: string;
};

const FALLBACKS: Record<FontCategory, string> = {
  mono: "ui-monospace, monospace",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

/** Build a Google Fonts CSS2 URL with `display=swap` so the browser
 *  paints fallback glyphs immediately and re-flows when the woff2
 *  arrives. Weights default to 400+700 — enough for body and bold. */
export function googleFontHref(family: string, weights = "400;700"): string {
  const familyParam = family.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap`;
}

function entry(
  family: string,
  category: FontCategory,
  weights?: string,
): FontEntry {
  return {
    id: `gf-${family.toLowerCase().replace(/\s+/g, "-")}`,
    family,
    category,
    cssHref: googleFontHref(family, weights),
    stack: `"${family}", ${FALLBACKS[category]}`,
  };
}

/** The full catalog. Order inside each category is the order shown to
 *  the user (popular faces first, neutral choices later). */
export const FONT_CATALOG: readonly FontEntry[] = [
  // ─── Monospace (most relevant for typing) ──────────────────────────
  entry("JetBrains Mono", "mono"),
  entry("Fira Code", "mono"),
  entry("Source Code Pro", "mono"),
  entry("IBM Plex Mono", "mono"),
  entry("Roboto Mono", "mono"),
  entry("Space Mono", "mono"),
  entry("Inconsolata", "mono"),
  entry("DM Mono", "mono"),
  entry("Anonymous Pro", "mono"),
  entry("Cousine", "mono"),
  entry("Ubuntu Mono", "mono"),
  entry("Courier Prime", "mono"),

  // ─── Sans ──────────────────────────────────────────────────────────
  entry("Inter", "sans"),
  entry("Roboto", "sans"),
  entry("Open Sans", "sans"),
  entry("Lato", "sans"),
  entry("Montserrat", "sans"),
  entry("Source Sans 3", "sans"),
  entry("Work Sans", "sans"),
  entry("Poppins", "sans"),
  entry("Nunito", "sans"),
  entry("DM Sans", "sans"),
  entry("IBM Plex Sans", "sans"),

  // ─── Serif ─────────────────────────────────────────────────────────
  entry("Merriweather", "serif"),
  entry("Playfair Display", "serif"),
  entry("Lora", "serif"),
  entry("Source Serif 4", "serif"),
  entry("IBM Plex Serif", "serif"),
  entry("Crimson Pro", "serif"),
  entry("EB Garamond", "serif"),
];

/** Look up a catalog entry whose family matches the first family in a
 *  CSS font-family stack. Used by the typography UI to show the active
 *  Google font on the picker trigger and by the loader to re-inject the
 *  active font's CSS on app startup. Returns null on no match — the
 *  user may have picked a system stack or a face we don't ship. */
export function findFontByStack(stack: string | undefined): FontEntry | null {
  if (!stack) return null;
  const first = stack.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (!first) return null;
  return FONT_CATALOG.find((e) => e.family === first) ?? null;
}
