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
import { KeyboardRow } from "../_components/rows/keyboard-row";
import { KeymapRows } from "../_components/rows/keymap-rows";
import {
  KeyboardLivePreview,
  KeymapLivePreview,
} from "../_components/rows/section-previews";
import { SettingsSection } from "../_components/settings-section";

const KEYBOARD_KEYS = Object.keys(DEFAULT_KEYBOARD) as (keyof KeyboardSettings)[];

export default function KeyboardSettingsPage() {
  const group = getGroup("keyboard");
  const { prefs, resetKeys } = useAppearancePrefs();
  const { settings, reset: resetKeyboard } = useKeyboardSettings();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.keyboard ?? [];

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

      <SettingsSection
        id="keyboard"
        title={sectionTitle(group, "keyboard")}
        description="The look of the keyboard that lights up under the text."
        preview={<KeyboardLivePreview />}
      >
        <KeyboardRow />
      </SettingsSection>

      <SettingsSection
        id="keymap"
        title={sectionTitle(group, "keymap")}
        description="Which keys show on that keyboard, and how they react."
        preview={<KeymapLivePreview />}
      >
        <KeymapRows />
      </SettingsSection>
    </div>
  );
}
