import type { AppearancePrefs } from "@/lib/appearance-prefs";

/** Which AppearancePrefs key belongs to which appearance section. Derived
 *  from the row components that actually read each key (one key → exactly
 *  one section), so a per-section "changed" badge can compare just that
 *  section's slice against the defaults. Theme-variable–backed sections
 *  (themes, colors, geometry radius, typography) and the caret / keyboard
 *  / background stores are resolved separately in `useSectionChanges`.
 *
 *  React-free on purpose: the pure comparison below is unit-tested, while
 *  the composing hook (with its store subscriptions) lives next door in
 *  `section-changes.ts`. */
export const APPEARANCE_SECTION_FIELDS = {
  geometry: ["borders"],
  surface: [
    "cardSurfaces",
    "dividers",
    "pagePadding",
    "backgroundFill",
    "monochromeChrome",
    "statStripSurface",
  ],
  chrome: ["topbarStyle", "footerStyle", "modeBarStyle", "autoHide"],
  caret: ["caretIdle"],
  mistakes: ["mistakeStyle", "markIncompleteWord"],
  "live-stats": [
    "liveProgressStyle",
    "liveSpeedStyle",
    "liveAccuracyStyle",
    "liveBurstStyle",
    "liveStatsColor",
    "liveStatsOpacity",
    "burstReps",
  ],
  "typing-area": [
    "highlightMode",
    "typedEffect",
    "linesRendered",
    "maxLineWidth",
    "smoothLineScroll",
    "quoteAttribution",
  ],
  tape: ["tapeMode", "tapeMargin", "tapeFade"],
  result: [
    "resultShowHeatmap",
    "resultShowExtras",
    "resultShowPerLetter",
    "resultShowHandBalance",
    "resultChrome",
    "startGraphsAtZero",
    "typingSpeedUnit",
    "alwaysShowDecimal",
  ],
  keymap: [
    "keymap",
    "keymapLayout",
    "keymapStyle",
    "keymapLegend",
    "keymapTopRow",
    "keymapSize",
    "keymapCompact",
  ],
  multiplayer: [
    "multiplayerPlayerColors",
    "multiplayerOpponentMarker",
    "multiplayerRaceFeed",
    "multiplayerShowOpponentWpm",
  ],
} satisfies Record<string, readonly (keyof AppearancePrefs)[]>;

/** Pure: the set of appearance sections whose AppearancePrefs slice
 *  differs from the defaults. Theme-var / store-backed sections are not
 *  computed here (they don't live in AppearancePrefs). */
export function changedAppearanceSections(
  prefs: AppearancePrefs,
  defaults: AppearancePrefs,
): Set<string> {
  const out = new Set<string>();
  for (const [section, fields] of Object.entries(APPEARANCE_SECTION_FIELDS)) {
    if (fields.some((f) => prefs[f] !== defaults[f])) out.add(section);
  }
  return out;
}
