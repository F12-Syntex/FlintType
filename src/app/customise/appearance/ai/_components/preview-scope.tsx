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
 *     (the live-spectate mechanism §17.6) merged onto the current prefs;
 *   - the Style knobs (button shape, depth, glow, app font) normally live
 *     on `<html>`, so the ones the patch sets are mirrored onto the
 *     wrapper instead — globals.css scopes each rule to any element.
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
    <div style={patch.theme as CSSProperties} {...styleScopeAttrs(patch)}>
      <PrefsOverrideProvider
        value={{ appearance: mergedAppearance, behaviour: mergedBehaviour }}
      >
        {children}
      </PrefsOverrideProvider>
    </div>
  );
}

/** `data-ft-*` attributes for the Style picks this patch makes, written
 *  explicitly (defaults included) so a preview can also undo a global
 *  non-default choice. Picks the patch doesn't touch inherit `<html>`. */
function styleScopeAttrs(patch: AppearancePatch): Record<string, string> {
  const a = patch.appearance as Partial<AppearancePrefs>;
  const out: Record<string, string> = {};
  if (typeof a.controlShape === "string") out["data-ft-controls"] = a.controlShape;
  if (typeof a.depth === "string") out["data-ft-depth"] = a.depth;
  if (typeof a.buttonGlow === "boolean") {
    out["data-ft-glow"] = a.buttonGlow ? "on" : "off";
  }
  if (typeof a.uiFont === "string") out["data-ft-ui-font"] = a.uiFont;
  return out;
}
