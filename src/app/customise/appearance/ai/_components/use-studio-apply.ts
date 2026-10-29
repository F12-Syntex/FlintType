"use client";

import { useCallback } from "react";
import { useThemeOverrides } from "@/lib/theme-customization";
import { usePaletteBaseline } from "@/lib/themes/use-palette-baseline";
import type { AppearancePatch } from "@/types/appearance-ai";
import { paletteRadiusRem } from "../../../_components/rows/radius-presets";
import { useApplyPatch } from "../../../_components/use-apply-patch";
import { settleRadius } from "./settle-radius";

/** "Apply to settings": writes the studio's preview patch through the
 *  same setters as the manual controls and keeps it. A corner pick the
 *  active palette already gives clears the override, as the Corners row
 *  does (settle-radius.ts), so a no-op pick doesn't fork the palette to
 *  Custom or show "Reset (1)". */
export function useStudioApply() {
  const { apply, commit } = useApplyPatch();
  const { clearVar } = useThemeOverrides();
  const { baseline, theme } = usePaletteBaseline();
  const baselineRadius = baseline.themeOverrides["--radius"];

  return useCallback(
    (patch: AppearancePatch) => {
      const settled = settleRadius(patch, {
        paletteRem: paletteRadiusRem(theme),
        baselineOverride: baselineRadius,
      });
      apply(settled.patch);
      if (settled.clearRadius) clearVar("--radius");
      commit();
    },
    [apply, clearVar, commit, theme, baselineRadius],
  );
}
