import type {
  CurrentSettings,
  ImportSliceKey,
} from "@/types/settings-import";
import { DEFAULT_APPEARANCE } from "../appearance-prefs";
import { DEFAULT_AUDIO } from "../audio-prefs";
import { DEFAULT_BACKGROUND, hasLocalImage } from "../background-prefs";
import { DEFAULT_BEHAVIOUR } from "../behaviour-prefs";
import { DEFAULT_CARET } from "../caret-settings";
import { DEFAULT_HAND_LAYOUT } from "../hand-layout";
import { DEFAULT_KEYBOARD } from "../keyboard-settings";
import { withLiveStatsColor } from "../live-stats-color-prefs";
import { getCache, loadPrefs, prefsMergePending, prefsOwner, readSlice } from "../prefs-store";

/** The practice slice's defaults, as the practice provider reads them
 *  (`src/app/_components/practice-state.tsx`). */
export const PRACTICE_DEFAULTS = {
  mode: "WORDS",
  length: 25,
  adapt: true,
  wordlist: "english",
} as const;

/** Defaults for every slice an import may write. */
export const SLICE_DEFAULTS: Record<ImportSliceKey, object> = {
  caret: DEFAULT_CARET,
  behaviour: DEFAULT_BEHAVIOUR,
  appearance: DEFAULT_APPEARANCE,
  background: DEFAULT_BACKGROUND,
  keyboard: DEFAULT_KEYBOARD,
  audio: DEFAULT_AUDIO,
  practice: PRACTICE_DEFAULTS,
  handLayout: DEFAULT_HAND_LAYOUT,
};

export const IMPORT_SLICES = Object.keys(SLICE_DEFAULTS) as ImportSliceKey[];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** A slice exactly as stored, without defaults merged in. Writes build
 *  on this, so an import adds only the fields it changes. */
export function rawSlice(key: string): Record<string, unknown> {
  const slice = getCache()?.[key];
  return isPlainObject(slice) ? slice : {};
}

/** Snapshot of the current settings for matching a file against them.
 *  Call after `loadPrefs()` has resolved. `mode` is next-themes' value;
 *  `shownColours` the colours on screen now (see `readShownColours`). */
export function readCurrentSettings(
  mode: string | null,
  shownColours?: Record<string, string>,
): CurrentSettings {
  const slices = {} as CurrentSettings["slices"];
  for (const key of IMPORT_SLICES) {
    const merged = readSlice<Record<string, unknown>>(
      key,
      SLICE_DEFAULTS[key] as Record<string, unknown>,
    );
    // The old shipped live-stats hex reads as "follow the palette".
    slices[key] = key === "appearance" ? withLiveStatsColor(merged) : merged;
  }
  const theme: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSlice("theme"))) {
    if (typeof v === "string") theme[k] = v;
  }
  const palette = rawSlice("palette");
  return {
    slices,
    theme,
    palette: {
      ...palette,
      activeId: typeof palette.activeId === "string" ? palette.activeId : null,
    },
    mode,
    ...(shownColours ? { shownColours } : {}),
    ...(hasLocalImage() ? { uploadedImage: true } : {}),
  };
}

/** Load the prefs store, then read whose settings it holds and what they
 *  are, together. If the owner changes while it loads (a sign-in in
 *  another tab), it loads again, so the settings read are that owner's. */
export async function loadCurrentSettings(
  mode: () => string | null,
  shownColours?: () => Record<string, string>,
): Promise<{ owner: string | null; current: CurrentSettings; pending: boolean }> {
  let owner: string | null | undefined;
  for (let tries = 0; tries < 3 && owner !== prefsOwner(); tries++) {
    owner = prefsOwner();
    await loadPrefs();
  }
  // `pending`: a sign-in whose account copy hasn't loaded, so these aren't the account's settings.
  return { owner: prefsOwner(), current: readCurrentSettings(mode(), shownColours?.()), pending: prefsMergePending() };
}
