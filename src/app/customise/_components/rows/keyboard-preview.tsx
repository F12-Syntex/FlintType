"use client";

import { Keyboard } from "@/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/_components/keyboard/layouts";
import { useAppearancePrefs } from "@/lib/appearance-prefs";

/* ─── Keyboard ─────────────────────────────────────────────────── */

/** The practice keyboard exactly as the test draws it: the layout,
 *  arrangement, labels, number row, size and "Letters only" from the
 *  appearance prefs, the key style and marks from the keyboard settings
 *  (read inside `<Keyboard>`). A few keys are held down so the pressed
 *  colour shows. `alwaysShow` (the AI studio tile) draws it even while
 *  the keyboard is switched off. */
export function KeyboardLivePreview({
  alwaysShow = false,
}: {
  alwaysShow?: boolean;
}) {
  const { prefs } = useAppearancePrefs();
  if (prefs.keymap === "off" && !alwaysShow) {
    return (
      <div className="flex min-h-[180px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
        The keyboard is off. Pick another option below to see it.
      </div>
    );
  }
  const layoutId: LayoutId =
    prefs.keymapLayout in LAYOUTS ? (prefs.keymapLayout as LayoutId) : "qwerty";
  return (
    <div className="px-4 py-5 sm:px-5 sm:py-6">
      <Keyboard
        layout={layoutId}
        mode={prefs.keymap === "static" ? "static" : "react"}
        legend={prefs.keymapLegend}
        topRow={prefs.keymapTopRow}
        scale={Math.min(prefs.keymapSize, 1)}
        forcedPressed={new Set(["KeyF", "KeyJ", "KeyD", "KeyK"])}
        settingsOverride={{ compact: prefs.keymapCompact }}
      />
    </div>
  );
}
