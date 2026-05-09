"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { BackgroundRow } from "../_components/background-row";
import { MiniSample } from "../_components/mini-sample";

export default function BackgroundPage() {
  return (
    <AppearanceSectionPage id="background" preview={<MiniSample />}>
      <BackgroundRow />
    </AppearanceSectionPage>
  );
}
