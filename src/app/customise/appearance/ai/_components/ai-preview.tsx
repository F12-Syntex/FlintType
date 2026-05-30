"use client";

import { type CSSProperties, useMemo } from "react";
import { Keyboard } from "@/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/_components/keyboard/layouts";
import { Passage } from "@/app/_components/passage";
import { Readouts } from "@/app/_components/readouts";
import {
  type AppearancePrefs,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { PrefsOverrideProvider } from "@/lib/prefs-override";
import type { AppearancePatch } from "@/types/appearance-ai";
import { PreviewPracticeProvider } from "../../../_components/preview-practice";
import { FitBox } from "./fit-box";

/** Desktop reference size the surface is composed at, then scaled to fit
 *  its pane on both axes (no scroll). Holds the full keyboard row. */
const DESIGN_W = 760;
const DESIGN_H = 600;

/** A read-only mirror of the real typing surface, themed with the
 *  *proposed* look in isolation: the appearance patch flows through
 *  `PrefsOverrideProvider` (the same mechanism live-spectate uses), the
 *  theme-var patch is set inline on the container (unset vars inherit the
 *  user's current cascade), and the background patch paints behind it.
 *  Nothing is written to the global stores until the user accepts, so the
 *  chat + the rest of the app keep the user's current theme. */
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
    <FitBox designWidth={DESIGN_W} designHeight={DESIGN_H}>
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-foreground/10 bg-background text-foreground"
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
            {/* topbar band */}
            <div className="relative z-10 flex items-center justify-between border-b border-foreground/10 bg-background/85 px-5 py-3 backdrop-blur-md">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                flinttype
              </span>
              <nav className="flex gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span className="text-foreground">Practice</span>
                <span>Drills</span>
                <span>Races</span>
              </nav>
            </div>

            <div className="relative z-10 flex flex-1 flex-col gap-5 px-7 py-6">
              <Readouts />
              <div className="relative min-h-0 flex-1">
                <Passage />
              </div>
              {showKeyboard ? (
                <div className="mt-auto">
                  <Keyboard
                    layout={layoutId}
                    mode={
                      mergedAppearance.keymap === "static" ? "static" : "react"
                    }
                    legend={mergedAppearance.keymapLegend}
                    topRow={mergedAppearance.keymapTopRow}
                    scale={Math.min(mergedAppearance.keymapSize, 0.82)}
                    forcedPressed={new Set(["KeyF", "KeyJ", "KeyK"])}
                    settingsOverride={{ compact: mergedAppearance.keymapCompact }}
                  />
                </div>
              ) : null}
            </div>

            {/* footer band */}
            <div className="relative z-10 flex items-center justify-between border-t border-foreground/10 bg-background/85 px-5 py-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              <span>flinttype © mmxxvi</span>
              <span className="flex gap-3">
                <span>GitHub</span>
                <span>Settings</span>
              </span>
            </div>
          </PreviewPracticeProvider>
        </PrefsOverrideProvider>
      </div>
    </FitBox>
  );
}
