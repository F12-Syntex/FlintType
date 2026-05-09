"use client";

import { Keyboard } from "@/app/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/app/_components/keyboard/layouts";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { AppearanceSectionPage } from "../_components/section-page";
import { KeymapRows } from "../_components/keymap-rows";

/** Live preview — the actual Keyboard component reflecting the user's
 *  current keymap prefs (layout, legend, top row, size, mode). The
 *  keymap section configures *this* widget; showing it here lets every
 *  option register. */
function KeymapPreview() {
  const { prefs } = useAppearancePrefs();

  if (prefs.keymap === "off") {
    return (
      <div className="flex min-h-[180px] items-center justify-center px-4 py-8 text-sm text-muted-foreground">
        Keymap is off — pick another mode below to see it appear.
      </div>
    );
  }

  // The prefs blob stores keymapLayout as `string` (it's user-editable),
  // so narrow it back to a known LayoutId before handing it to Keyboard.
  // Falls back to qwerty if a stranger value ever lands.
  const layoutId: LayoutId =
    prefs.keymapLayout in LAYOUTS ? (prefs.keymapLayout as LayoutId) : "qwerty";

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <Keyboard
        layout={layoutId}
        mode={prefs.keymap === "static" ? "static" : "react"}
        legend={prefs.keymapLegend}
        topRow={prefs.keymapTopRow}
        scale={Math.min(prefs.keymapSize, 1)}
        forcedPressed={new Set(["KeyF", "KeyJ", "KeyD", "KeyK"])}
      />
    </div>
  );
}

export default function KeymapPage() {
  return (
    <AppearanceSectionPage id="keymap" preview={<KeymapPreview />}>
      <KeymapRows />
    </AppearanceSectionPage>
  );
}
