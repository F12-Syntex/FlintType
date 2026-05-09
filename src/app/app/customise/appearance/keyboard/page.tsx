"use client";

import { Keyboard } from "@/app/app/_components/keyboard";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { AppearanceSectionPage } from "../_components/section-page";
import { KeyboardRow } from "../_components/keyboard-row";

/** Live preview — the real Keyboard component reading the user's saved
 *  settings. Three keys are forced into the lit state (home pegs +
 *  one) so design/shape choices are visible without anyone typing. */
function KeyboardPreview() {
  const { settings } = useKeyboardSettings();
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <Keyboard
        settingsOverride={settings}
        forcedPressed={new Set(["KeyF", "KeyJ", "KeyK"])}
        mode="static"
        scale={0.85}
      />
    </div>
  );
}

export default function KeyboardPage() {
  return (
    <AppearanceSectionPage id="keyboard" preview={<KeyboardPreview />}>
      <div className="flex flex-col gap-3">
        <KeyboardRow />
      </div>
    </AppearanceSectionPage>
  );
}
