"use client";

import {
  DEFAULT_APPEARANCE,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  type CaretSettings,
  DEFAULT_CARET,
  useCaretSettings,
} from "@/lib/caret-settings";
import { useThemeOverrides } from "@/lib/theme-customization";
import {
  countCustomised,
  countOverriddenVars,
  getGroup,
  GROUP_APPEARANCE_KEYS,
  GROUP_THEME_VARS,
  sectionTitle,
} from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { CaretRow } from "../_components/rows/caret-row";
import { MistakesRows } from "../_components/rows/mistakes-row";
import { HighlightRows, LayoutRows } from "../_components/rows/passage-rows";
import {
  CaretPreview,
  TypingAreaPreview,
  TypographyPreview,
} from "../_components/rows/passage-previews";
import { TapeRows } from "../_components/rows/tape-row";
import { TypographyRows } from "../_components/rows/typography-row";
import { SettingsSection } from "../_components/settings-section";

const CARET_KEYS = Object.keys(DEFAULT_CARET) as (keyof CaretSettings)[];

export default function TypingSettingsPage() {
  const group = getGroup("typing");
  const { prefs, resetKeys } = useAppearancePrefs();
  const { settings: caret, reset: resetCaret } = useCaretSettings();
  const { overrides, clearVar } = useThemeOverrides();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.typing ?? [];
  const fontVars = GROUP_THEME_VARS.typing ?? [];

  const customizedCount =
    countCustomised(prefs, DEFAULT_APPEARANCE, appearanceKeys) +
    countCustomised(caret, DEFAULT_CARET, CARET_KEYS) +
    countOverriddenVars(overrides, fontVars);

  function handleReset() {
    resetKeys(appearanceKeys);
    resetCaret();
    for (const v of fontVars) clearVar(v);
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={handleReset}
      />

      <SettingsSection
        id="typography"
        title={sectionTitle(group, "typography")}
        description="The typeface, size and spacing of the text you type."
        preview={<TypographyPreview />}
      >
        <TypographyRows />
      </SettingsSection>

      <SettingsSection
        id="caret"
        title={sectionTitle(group, "caret")}
        description="The marker that shows where you are."
        preview={<CaretPreview />}
      >
        <CaretRow />
      </SettingsSection>

      <SettingsSection
        id="typing-area"
        title={sectionTitle(group, "typing-area")}
        description="What the text does as you type through it."
        preview={<TypingAreaPreview />}
      >
        <HighlightRows />
        <MistakesRows />
        <LayoutRows />
        <TapeRows />
      </SettingsSection>
    </div>
  );
}
