"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { BackgroundRow } from "../_components/background-row";
import { BackgroundPreview } from "../_previews/background";

export default function BackgroundPage() {
  return (
    <AppearanceSectionPage id="background" preview={<BackgroundPreview />}>
      <BackgroundRow />
    </AppearanceSectionPage>
  );
}
