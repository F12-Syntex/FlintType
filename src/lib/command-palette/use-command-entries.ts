"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useAudioPrefs } from "@/lib/audio-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { usePalette } from "@/lib/themes/use-palette";
import { behaviourEntries } from "./entries-behaviour";
import { generalEntries } from "./entries-general";
import { interfaceEntries } from "./entries-interface";
import { keyboardEntries } from "./entries-keyboard";
import { navigateEntries } from "./entries-navigate";
import { statsEntries } from "./entries-stats";
import { typingEntries } from "./entries-typing";
import type { CommandEntry } from "./types";

/** Build every command-palette entry from the project's live pref
 *  hooks. Re-runs only when the underlying prefs change.
 *
 *  Discipline (ui-law §16.2):
 *    - One entry per user-facing setting, labelled like its settings
 *      row. Toggles + enums render inline (Enter flips / expands).
 *      Sliders and colour pickers deep-link to
 *      /customise/<page>#<section> via a `link` entry — those controls
 *      don't fit a one-line keyboard-only flow.
 *    - Each settings area builds its entries in its own module
 *      (`entries-*.ts`, pure and unit-tested); this hook only wires the
 *      pref hooks in. The palette groups entries by `group` and keeps
 *      this order inside each group. */
export function useCommandEntries(): readonly CommandEntry[] {
  const router = useRouter();
  const { prefs: ap, update: setAp } = useAppearancePrefs();
  const { prefs: audio, update: setAudio } = useAudioPrefs();
  const { prefs: bp, update: setBp } = useBehaviourPrefs();
  const { settings: cs, update: setCs } = useCaretSettings();
  const { settings: ks, update: setKs } = useKeyboardSettings();
  const {
    themes,
    activeId: paletteId,
    apply: applyPalette,
    reset: resetPalette,
  } = usePalette();
  const { theme: mode, setTheme: setMode } = useNextTheme();

  return useMemo<readonly CommandEntry[]>(
    () => [
      ...generalEntries({
        mode,
        setMode,
        paletteId,
        themes,
        applyPalette,
        resetPalette,
      }),
      ...behaviourEntries({ bp, setBp, audio, setAudio }),
      ...typingEntries({ ap, setAp, cs, setCs }),
      ...keyboardEntries({ ap, setAp, ks, setKs }),
      ...interfaceEntries({ ap, setAp }),
      ...statsEntries({ ap, setAp }),
      ...navigateEntries((href) => router.push(href)),
    ],
    [
      router,
      mode,
      setMode,
      paletteId,
      themes,
      applyPalette,
      resetPalette,
      ap,
      setAp,
      audio,
      setAudio,
      bp,
      setBp,
      cs,
      setCs,
      ks,
      setKs,
    ],
  );
}
