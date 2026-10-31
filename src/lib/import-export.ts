"use client";

import { getCache, loadPrefs, writeSlice } from "./prefs-store";

/** All known slice keys — every flinttype-managed pref slice the
 *  importer/exporter understands. Anything outside this list is left
 *  alone on import (so we never blow away a slice we don't recognize)
 *  and dropped on export (so old experiments don't leak into a JSON the
 *  user might paste into a different machine). */
const KNOWN_SLICES = [
  "caret",
  "appearance",
  "behaviour",
  "background",
  "keyboard",
  "theme",
  "palette",
  "practice",
] as const;

// ─── Export ──────────────────────────────────────────────────────────

export type FlinttypeExport = {
  app: "flinttype";
  version: 1;
  exportedAt: string;
  slices: Record<string, unknown>;
};

/** Build a JSON snapshot of the user's prefs blob. Awaits the initial
 *  load so a fresh tab still gets a usable export instead of `{}`. */
export async function buildFlinttypeExport(): Promise<FlinttypeExport> {
  await loadPrefs();
  const cache = getCache() ?? {};
  const slices: Record<string, unknown> = {};
  for (const key of KNOWN_SLICES) {
    if (key in cache) slices[key] = cache[key];
  }
  return {
    app: "flinttype",
    version: 1,
    exportedAt: new Date().toISOString(),
    slices,
  };
}

/** Trigger a browser download of the export blob. */
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

// ─── Import plans ───────────────────────────────────────────────────
//
// `planFlinttypeImport` returns a plan rather than committing
// directly. The UI shows the plan in a confirmation dialog, then
// invokes `apply()` once the user accepts. This way the user sees what
// will change *before* their settings are stomped, and a misclicked
// import is recoverable (just hit Cancel).

/** Key/value detail row inside a change card. The UI renders these as
 *  a clean two-column grid (`Style ── line`, `Smooth ── 250ms`) instead
 *  of a bulleted list, so the dialog reads like a spec sheet. */
export type ImportChangeDetail = {
  key: string;
  value: string;
};

/** A single human-readable change row in an import plan. */
export type ImportChange = {
  /** Slice the row will write to. */
  slice: string;
  /** Short headline describing what the slice will contain. */
  label: string;
  /** Optional ordered list of key/value details. */
  details?: ImportChangeDetail[];
};

/** What a planned import will do, plus the commit fn that performs it. */
export type ImportPlan = {
  source: "flinttype";
  /** Title of the source the import was parsed from — surfaced as the
   *  dialog header. */
  title: string;
  /** Each slice the import will write, in the order it'll be applied. */
  changes: ImportChange[];
  /** Run the import. Returns the count of slices touched. */
  apply: () => number;
};

// ─── Flinttype import ────────────────────────────────────────────────

/** Plan a flinttype JSON import. Each slice in the export becomes one
 *  change row; the row's details list the top-level keys that will be
 *  written so the user can see roughly what's coming over. */
export function planFlinttypeImport(payload: unknown): ImportPlan {
  if (!isFlinttypeExport(payload)) {
    throw new Error("Not a flinttype export — expected app: 'flinttype'.");
  }
  const slices = payload.slices;
  const changes: ImportChange[] = [];
  for (const key of KNOWN_SLICES) {
    const slice = slices[key];
    if (slice == null || typeof slice !== "object") continue;
    const keys = Object.keys(slice as object);
    const preview = keys.slice(0, 6).join(", ");
    const summary = keys.length > 6 ? `${preview}, …` : preview;
    changes.push({
      slice: key,
      label: SLICE_LABELS[key] ?? key,
      details: [
        {
          key: `${keys.length} field${keys.length === 1 ? "" : "s"}`,
          value: summary || "—",
        },
      ],
    });
  }
  return {
    source: "flinttype",
    title: "Import flinttype settings",
    changes,
    apply: () => {
      let n = 0;
      for (const c of changes) {
        const slice = slices[c.slice];
        if (slice == null || typeof slice !== "object") continue;
        writeSlice(c.slice, slice);
        n += 1;
      }
      return n;
    },
  };
}

/** Legacy direct-apply entrypoint — kept for tests and any caller that
 *  doesn't want the dialog flow. */
export function importFlinttype(payload: unknown): number {
  return planFlinttypeImport(payload).apply();
}

const SLICE_LABELS: Record<string, string> = {
  caret: "Caret",
  appearance: "Appearance",
  behaviour: "Behaviour",
  background: "Background image",
  keyboard: "Keyboard",
  theme: "Theme overrides",
  palette: "Palette",
  practice: "Practice mode",
};

function isFlinttypeExport(v: unknown): v is FlinttypeExport {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    r.app === "flinttype" &&
    typeof r.version === "number" &&
    r.slices != null &&
    typeof r.slices === "object"
  );
}

// Re-export the slice keys so tests can reference them as a constant.
export { KNOWN_SLICES };
