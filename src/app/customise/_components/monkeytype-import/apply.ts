import { DEFAULT_APPEARANCE } from "@/lib/appearance-prefs";
import { DEFAULT_AUDIO } from "@/lib/audio-prefs";
import { DEFAULT_BACKGROUND } from "@/lib/background-prefs";
import { DEFAULT_BEHAVIOUR } from "@/lib/behaviour-prefs";
import { DEFAULT_CARET } from "@/lib/caret-settings";
import { readSlice, writeSlice } from "@/lib/prefs-store";
import { INITIAL_LENGTH } from "@/app/_components/practice-words";
import type { MtGroup, MtSettings, MtSlice } from "./types";

const DEFAULTS: MtSettings = {
  caret: DEFAULT_CARET,
  appearance: DEFAULT_APPEARANCE,
  behaviour: DEFAULT_BEHAVIOUR,
  background: DEFAULT_BACKGROUND,
  audio: DEFAULT_AUDIO,
  // The practice surface's own defaults (practice-state.tsx).
  practice: { mode: "WORDS", length: INITIAL_LENGTH, wordlist: "english" },
};

/** The settings as the settings pages read them now. Call after
 *  `loadPrefs()` so the stored values are in. */
export function readCurrentSettings(): MtSettings {
  const out = {} as Record<MtSlice, unknown>;
  for (const slice of Object.keys(DEFAULTS) as MtSlice[]) {
    out[slice] = readSlice(slice, DEFAULTS[slice] as object);
  }
  return out as MtSettings;
}

/** Write one group's fields onto the stored slices. Every other field
 *  keeps its value, and only the written fields are marked as changed,
 *  the same way a settings row writes. */
export function applyGroup(group: MtGroup): void {
  for (const [slice, patch] of Object.entries(group.patches) as [MtSlice, Record<string, unknown>][]) {
    const fields = Object.keys(patch);
    if (fields.length === 0) continue;
    // The practice slice also holds `adapt`; merge onto what is stored.
    const base = slice === "practice" ? {} : DEFAULTS[slice];
    const now = readSlice<Record<string, unknown>>(slice, base as Record<string, unknown>);
    writeSlice(slice, { ...now, ...patch }, fields);
  }
}
