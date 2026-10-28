"use client";

import {
  DEFAULT_APPEARANCE,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  countCustomised,
  getGroup,
  GROUP_APPEARANCE_KEYS,
  sectionTitle,
} from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { MultiplayerRows } from "../_components/rows/multiplayer-rows";
import { MultiplayerPreview } from "../_components/rows/multiplayer-preview";
import {
  SPECTATE_DEFAULT,
  SpectateSection,
  useSpectatePrefs,
} from "../_components/rows/spectate-section";
import { SettingsSection } from "../_components/settings-section";

export default function SocialSettingsPage() {
  const group = getGroup("social");
  const { prefs, resetKeys } = useAppearancePrefs();
  const { value: spectate, update: updateSpectate } = useSpectatePrefs();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.social ?? [];

  const customizedCount =
    countCustomised(prefs, DEFAULT_APPEARANCE, appearanceKeys) +
    (spectate.enabled === false ? 1 : 0) +
    ((spectate.blocked ?? []).length > 0 ? 1 : 0);

  function handleReset() {
    resetKeys(appearanceKeys);
    updateSpectate({ ...SPECTATE_DEFAULT, blocked: [] });
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={handleReset}
      />

      <SettingsSection
        id="multiplayer"
        title={sectionTitle(group, "multiplayer")}
        description="How other racers show up in a race."
        preview={<MultiplayerPreview />}
      >
        <MultiplayerRows />
      </SettingsSection>

      <SpectateSection />
    </div>
  );
}
