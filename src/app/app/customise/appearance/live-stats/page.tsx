"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { LiveStatsRows } from "../_components/live-stats-rows";
import { MiniSample } from "../_components/mini-sample";

export default function LiveStatsPage() {
  return (
    <AppearanceSectionPage id="live-stats" preview={<MiniSample />}>
      <LiveStatsRows />
    </AppearanceSectionPage>
  );
}
