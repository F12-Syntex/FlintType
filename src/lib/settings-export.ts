"use client";

import { loadPrefs, readSlice } from "./prefs-store";
import { FT_FIELDS } from "./settings-import/ft-fields";
import { IMPORT_SLICES, rawSlice, SLICE_DEFAULTS } from "./settings-import/slices";
import { LIVE_STATS_COLOR_PICKED } from "./live-stats-color-prefs";
import { THEME_VARS } from "./theme-customization";

/** Every flinttype-managed prefs slice the exporter writes (and the
 *  importer reads back). Anything outside this list is dropped on
 *  export, so old experiments don't leak into a file the user might
 *  load on another machine. */
export const EXPORT_SLICES = [...IMPORT_SLICES, "theme", "palette"] as const;

export type FlinttypeExport = {
  app: "flinttype";
  version: 1;
  exportedAt: string;
  slices: Record<string, unknown>;
};

/** A settings slice in full: every known field, at its default when the
 *  user never changed it. Importing a file is then a true restore. */
function fullSlice(key: (typeof IMPORT_SLICES)[number]): Record<string, unknown> {
  const merged = readSlice<Record<string, unknown>>(key, SLICE_DEFAULTS[key] as Record<string, unknown>);
  const known = key === "handLayout" ? ["fingers"] : Object.keys(FT_FIELDS[key]);
  const out: Record<string, unknown> = {};
  for (const field of known) out[field] = merged[field];
  // The pick stamp tells a chosen orange apart from the old default.
  if (key === "appearance" && merged[LIVE_STATS_COLOR_PICKED] === true) out[LIVE_STATS_COLOR_PICKED] = true;
  return out;
}

/** Build a JSON snapshot of the user's settings. Awaits the initial
 *  load so a fresh tab still gets a usable export instead of `{}`. */
export async function buildFlinttypeExport(): Promise<FlinttypeExport> {
  await loadPrefs();
  const slices: Record<string, unknown> = {};
  for (const key of IMPORT_SLICES) slices[key] = fullSlice(key);
  // Overrides as stored (none is an empty object, still exported).
  const theme: Record<string, string> = {};
  const stored = rawSlice("theme");
  for (const name of THEME_VARS) {
    const v = stored[name];
    if (typeof v === "string" && v !== "") theme[name] = v;
  }
  slices.theme = theme;
  const palette = rawSlice("palette");
  slices.palette = typeof palette.activeId === "string" ? palette : { activeId: null };
  return {
    app: "flinttype",
    version: 1,
    exportedAt: new Date().toISOString(),
    slices,
  };
}

/** Trigger a browser download of `data` as pretty JSON. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
