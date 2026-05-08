"use client";

import { useCallback } from "react";
import {
  DEFAULT_HAND_LAYOUT,
  type FingerId,
  type FingerState,
} from "./hand-layout";
import { useRemotePrefs } from "./use-remote-prefs";

/** Client hook over the user's hand-layout slice. Lives in its own
 *  module so the data layer (`hand-layout.ts`) can stay non-client
 *  and be safely imported from server routes (history, adapt, the
 *  motor-feature pipeline) without Next.js flagging the helpers as
 *  client references. */
export function useHandLayout() {
  const { value, update, reset } = useRemotePrefs(
    "handLayout",
    DEFAULT_HAND_LAYOUT,
  );

  const setFinger = useCallback(
    (id: FingerId, patch: Partial<FingerState>) => {
      update((prev) => ({
        ...prev,
        fingers: {
          ...prev.fingers,
          [id]: { ...prev.fingers[id], ...patch },
        },
      }));
    },
    [update],
  );

  const toggleEnabled = useCallback(
    (id: FingerId) => {
      update((prev) => ({
        ...prev,
        fingers: {
          ...prev.fingers,
          [id]: {
            ...prev.fingers[id],
            enabled: !prev.fingers[id].enabled,
          },
        },
      }));
    },
    [update],
  );

  return { layout: value, setFinger, toggleEnabled, reset } as const;
}
