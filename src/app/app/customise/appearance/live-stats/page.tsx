"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { LiveStatsRows } from "../_components/live-stats-rows";
import { LiveStatsPreview } from "../_previews/live-stats";

export default function LiveStatsPage() {
  return (
    <AppearanceSectionPage id="live-stats" preview={<LiveStatsPreview />}>
      <LiveStatsRows />
    </AppearanceSectionPage>
  );
}
