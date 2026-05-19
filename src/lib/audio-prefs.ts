"use client";

import { useCallback, useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

/** Per-user audio settings — today only the per-keystroke "click"
 *  sound. Stored as a separate prefs slice (not folded into
 *  `behaviour`) so audio decisions don't tangle up the input-handling
 *  table: an audio toggle isn't a discipline setting, and grouping
 *  them invites a `behaviour.sound*` zoo. */
export type AudioPrefs = {
  /** When true, every printable keystroke + space + backspace fires a
   *  short synthesized click. Off by default — explicit opt-in keeps
   *  silent default users silent. */
  keypressClickEnabled: boolean;
  /** 0..100. Linear gain into the Web Audio click — 50 is the
   *  intended "comfortable headphone" level; 100 is loud but not
   *  clipping. */
  keypressClickVolume: number;
};

export const DEFAULT_AUDIO: AudioPrefs = {
  keypressClickEnabled: false,
  keypressClickVolume: 50,
};

export function useAudioPrefs() {
  const { value: prefs, update: updateRaw, reset } = useRemotePrefs(
    "audio",
    DEFAULT_AUDIO,
  );

  const update = useCallback(
    <K extends keyof AudioPrefs>(key: K, value: AudioPrefs[K]) => {
      updateRaw({ [key]: value } as Partial<AudioPrefs>);
    },
    [updateRaw],
  );

  const customizedCount = useMemo(
    () =>
      (Object.keys(DEFAULT_AUDIO) as Array<keyof AudioPrefs>).reduce(
        (n, k) => n + (prefs[k] !== DEFAULT_AUDIO[k] ? 1 : 0),
        0,
      ),
    [prefs],
  );

  return { prefs, update, reset, customizedCount } as const;
}
