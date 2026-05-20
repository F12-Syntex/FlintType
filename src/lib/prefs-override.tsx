"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppearancePrefs } from "./appearance-prefs";
import type { BehaviourPrefs } from "./behaviour-prefs";
import type { CaretSettings } from "./caret-settings";

/** Read-only override for the appearance / caret / behaviour pref hooks.
 *  Normally those hooks read the current user's prefs from the global
 *  prefs store. When a subtree is wrapped in `<PrefsOverrideProvider>`,
 *  the hooks return the override instead (and their `update`/`reset`
 *  become no-ops) — this is how the live-spectate clone renders the real
 *  `<Passage>` / `<Readouts>` with the *broadcaster's* settings instead
 *  of the viewer's, without touching the viewer's stored prefs.
 *
 *  Only the slices present in the override are overridden; an absent
 *  slice falls through to the global store as usual. */
export type PrefsOverride = {
  appearance?: AppearancePrefs;
  caret?: CaretSettings;
  behaviour?: BehaviourPrefs;
};

const PrefsOverrideContext = createContext<PrefsOverride | null>(null);

export function PrefsOverrideProvider({
  value,
  children,
}: {
  value: PrefsOverride;
  children: ReactNode;
}) {
  return (
    <PrefsOverrideContext.Provider value={value}>
      {children}
    </PrefsOverrideContext.Provider>
  );
}

export function usePrefsOverride(): PrefsOverride | null {
  return useContext(PrefsOverrideContext);
}
