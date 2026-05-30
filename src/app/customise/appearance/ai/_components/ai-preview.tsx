"use client";

import { type CSSProperties, useMemo } from "react";
import { Keyboard } from "@/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/_components/keyboard/layouts";
import { Passage } from "@/app/_components/passage";
import { MobileReadouts, Readouts } from "@/app/_components/readouts";
import {
  type AppearancePrefs,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { PrefsOverrideProvider } from "@/lib/prefs-override";
import type { AppearancePatch } from "@/types/appearance-ai";
import { PreviewPracticeProvider } from "../../../_components/preview-practice";

/** A **native** mirror of the real typing surface — the same `<Readouts>`
 *  / `<Passage>` / `<Keyboard>` the test screen runs, at their real sizes
 *  and fonts (no shrink-to-fit, no mock chrome). It just fills the pane.
 *
 *  The *proposed* look is themed in isolation: the appearance patch flows
 *  through `<PrefsOverrideProvider>` (the live-spectate mechanism §17.6),
 *  the theme-var patch is set inline on the container (unset vars inherit
 *  the user's current cascade), and the background patch paints behind it.
 *  Nothing is written to the global stores until the user accepts, so the
 *  dock + the rest of the app keep the user's current theme. */
export function AiPreview({ patch }: { patch: AppearancePatch | null }) {
  const { prefs: baseAppearance } = useAppearancePrefs();
  const { prefs: baseBackground, effectiveImage } = useBackgroundPrefs();

  const mergedAppearance = useMemo<AppearancePrefs>(() => {
    if (!patch || Object.keys(patch.appearance).length === 0) {
      return baseAppearance;
    }
    return {
      ...baseAppearance,
      ...(patch.appearance as Partial<AppearancePrefs>),
    };
  }, [baseAppearance, patch]);

  const themeStyle = useMemo<CSSProperties>(
    () => (patch ? ({ ...patch.theme } as CSSProperties) : {}),
    [patch],
  );

  const bg = useMemo(
    () => ({ ...baseBackground, ...(patch?.background ?? {}) }),
    [baseBackground, patch],
  );
  const image = (patch?.background?.imageUrl as string) || effectiveImage;

  const layoutId: LayoutId =
    mergedAppearance.keymapLayout in LAYOUTS
      ? (mergedAppearance.keymapLayout as LayoutId)
      : "qwerty";
  const showKeyboard = mergedAppearance.keymap !== "off";

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-background text-foreground"
      style={themeStyle}
    >
      {image ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url("${image}")`,
              backgroundSize:
                bg.fit === "tile" || bg.fit === "auto" ? "auto" : bg.fit,
              backgroundRepeat: bg.fit === "tile" ? "repeat" : "no-repeat",
              backgroundPosition: "center",
              opacity: bg.opacity,
              filter: bg.blur > 0 ? `blur(${bg.blur}px)` : undefined,
            }}
          />
          {bg.darken > 0 ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black"
              style={{ opacity: bg.darken }}
            />
          ) : null}
        </>
      ) : null}

      <PrefsOverrideProvider value={{ appearance: mergedAppearance }}>
        <PreviewPracticeProvider phase="running">
          {/* Same shape as the real <TypingSurface>: readouts ride in the
              passage's `above` slot (desktop), the passage fills, the
              keyboard sits at the bottom. */}
          <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 px-4 py-5 sm:gap-4 sm:px-12 sm:py-6 lg:px-20">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Passage
                above={
                  <div className="hidden pb-3 sm:pb-4 md:block">
                    <Readouts />
                  </div>
                }
              />
            </div>
            <div className="md:hidden">
              <MobileReadouts />
            </div>
            {showKeyboard ? (
              <div className="mt-auto hidden md:block">
                <Keyboard
                  layout={layoutId}
                  mode={
                    mergedAppearance.keymap === "static" ? "static" : "react"
                  }
                  legend={mergedAppearance.keymapLegend}
                  topRow={mergedAppearance.keymapTopRow}
                  scale={mergedAppearance.keymapSize}
                  forcedPressed={new Set(["KeyF", "KeyJ", "KeyK"])}
                  settingsOverride={{ compact: mergedAppearance.keymapCompact }}
                />
              </div>
            ) : null}
          </div>
        </PreviewPracticeProvider>
      </PrefsOverrideProvider>
    </div>
  );
}
