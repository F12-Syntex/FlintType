/** The live-stats colour (`appearance.liveStatsColor`) and its one
 *  legacy value. React-free; see `live-stats-color-prefs.test.ts`.
 *
 *  The colour used to ship as the brand hex itself, and appearance
 *  slices were saved whole, so every account that changed any
 *  appearance setting back then still stores "#f97316". That stored
 *  copy means "follow the palette" (""), so other palettes keep their
 *  own primary and Reset doesn't count it.
 *
 *  The same hex is also a swatch the user can pick today. Every write
 *  of the colour from the settings stamps `LIVE_STATS_COLOR_PICKED`
 *  into the slice, so a picked "#f97316" is kept as the user's choice
 *  while an unstamped one still reads as the old default. */

export const LEGACY_LIVE_STATS_COLOR = "#f97316";

/** Slice field marking `liveStatsColor` as the user's own pick. Lives
 *  only in the stored slice: `useAppearancePrefs` strips it from the
 *  prefs it hands out. */
export const LIVE_STATS_COLOR_PICKED = "liveStatsColorPicked";

type StoredColour = { liveStatsColor?: unknown } & Record<string, unknown>;

/** The colour a stored appearance slice means: "" (follow the palette)
 *  for the unstamped legacy hex, otherwise the stored value. */
export function liveStatsColorOf(stored: StoredColour): string {
  const color =
    typeof stored.liveStatsColor === "string" ? stored.liveStatsColor : "";
  const legacy =
    color.trim().toLowerCase() === LEGACY_LIVE_STATS_COLOR &&
    stored[LIVE_STATS_COLOR_PICKED] !== true;
  return legacy ? "" : color;
}

/** The slice patch for setting the colour from the settings. */
export function liveStatsColorPatch(color: string): Record<string, unknown> {
  return { liveStatsColor: color, [LIVE_STATS_COLOR_PICKED]: true };
}

/** A stored slice as prefs: the legacy hex mapped to "" and the pick
 *  stamp removed. Returns the same object when there is nothing to do. */
export function withLiveStatsColor<T extends object>(stored: T): T {
  const rec = stored as StoredColour;
  const color = liveStatsColorOf(rec);
  if (color === rec.liveStatsColor && !(LIVE_STATS_COLOR_PICKED in rec)) {
    return stored;
  }
  const next: StoredColour = { ...rec, liveStatsColor: color };
  delete next[LIVE_STATS_COLOR_PICKED];
  return next as T;
}
