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
import { LiveStatsRows } from "../_components/rows/live-stats-rows";
import { ResultRows } from "../_components/rows/result-rows";
import {
  LiveStatsPreview,
  ResultLivePreview,
} from "../_components/rows/section-previews";
import { SettingsSection } from "../_components/settings-section";

export default function StatsSettingsPage() {
  const group = getGroup("stats");
  const { prefs, resetKeys } = useAppearancePrefs();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.stats ?? [];
  const customizedCount = countCustomised(
    prefs,
    DEFAULT_APPEARANCE,
    appearanceKeys,
  );

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={() => resetKeys(appearanceKeys)}
      />

      <SettingsSection
        id="live-stats"
        title={sectionTitle(group, "live-stats")}
        description="The numbers shown while you type, and how much room they take."
        preview={<LiveStatsPreview />}
      >
        <LiveStatsRows />
      </SettingsSection>

      <SettingsSection
        id="result"
        title={sectionTitle(group, "result")}
        description="What you see when a test ends."
        preview={<ResultLivePreview />}
      >
        <ResultRows />
      </SettingsSection>
    </div>
  );
}
