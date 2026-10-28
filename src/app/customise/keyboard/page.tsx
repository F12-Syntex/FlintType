"use client";

import {
  DEFAULT_APPEARANCE,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  DEFAULT_KEYBOARD,
  type KeyboardSettings,
  useKeyboardSettings,
} from "@/lib/keyboard-settings";
import {
  countCustomised,
  getGroup,
  GROUP_APPEARANCE_KEYS,
  sectionTitle,
} from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { KeyMarkRows, KeyStyleRows } from "../_components/rows/keyboard-row";
import {
  KeymapContentRows,
  KeymapLayoutRows,
  KeymapShowRow,
} from "../_components/rows/keymap-rows";
import { KeyboardLivePreview } from "../_components/rows/section-previews";
import { SettingsSection } from "../_components/settings-section";

/** The keyboard-settings fields that have a control here. `compact` is
 *  left out: the practice keyboard takes "Letters only" from the
 *  appearance pref (`keymapCompact`), so it isn't counted — though the
 *  page's Reset still clears it with the rest. */
const KEYBOARD_KEYS: readonly (keyof KeyboardSettings)[] = [
  "design",
  "shape",
  "highlightHomeRow",
  "showShiftLabels",
];

export default function KeyboardSettingsPage() {
  const group = getGroup("keyboard");
  const { prefs, resetKeys } = useAppearancePrefs();
  const { settings, reset: resetKeyboard } = useKeyboardSettings();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.keyboard ?? [];
  const shown = prefs.keymap !== "off";

  const customizedCount =
    countCustomised(prefs, DEFAULT_APPEARANCE, appearanceKeys) +
    countCustomised(settings, DEFAULT_KEYBOARD, KEYBOARD_KEYS);

  function handleReset() {
    resetKeys(appearanceKeys);
    resetKeyboard();
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={handleReset}
      />

      {/* One keyboard, one section: whether it shows comes first, and
          every other row only appears while it does (§12.1). */}
      <SettingsSection
        id="keyboard"
        title={sectionTitle(group, "keyboard")}
        description="The keyboard under the text, and how it reacts as you type."
        preview={<KeyboardLivePreview />}
      >
        <KeymapShowRow />
        {shown ? (
          <>
            <KeymapLayoutRows />
            <KeyStyleRows />
            <KeymapContentRows />
            <KeyMarkRows />
          </>
        ) : null}
      </SettingsSection>
    </div>
  );
}
