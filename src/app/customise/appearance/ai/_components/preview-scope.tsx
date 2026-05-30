"use client";

import { type CSSProperties, type ReactNode } from "react";
import {
  type AppearancePrefs,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { type BehaviourPrefs, useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { PrefsOverrideProvider } from "@/lib/prefs-override";
import type { AppearancePatch } from "@/types/appearance-ai";

/** Render children themed with the AI's *proposed* patch in isolation, so
 *  the studio previews change while the user's real config doesn't:
 *   - theme vars are set inline on the wrapper (unset vars inherit the
 *     user's current cascade);
 *   - appearance + behaviour overrides flow through `<PrefsOverrideProvider>`
 *     (the live-spectate mechanism §17.6) merged onto the current prefs.
 *  Nothing here writes to the global stores. */
export function PreviewScope({
  patch,
  children,
}: {
  patch: AppearancePatch;
  children: ReactNode;
}) {
  const { prefs: appearance } = useAppearancePrefs();
  const { prefs: behaviour } = useBehaviourPrefs();

  const mergedAppearance = {
    ...appearance,
    ...(patch.appearance as Partial<AppearancePrefs>),
  } as AppearancePrefs;
  const mergedBehaviour = {
    ...behaviour,
    ...(patch.behaviour as Partial<BehaviourPrefs>),
  } as BehaviourPrefs;

  return (
    <div style={patch.theme as CSSProperties}>
      <PrefsOverrideProvider
        value={{ appearance: mergedAppearance, behaviour: mergedBehaviour }}
      >
        {children}
      </PrefsOverrideProvider>
    </div>
  );
}
