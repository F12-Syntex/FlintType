"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { MiniSample } from "../_components/mini-sample";
import { TypographyRows } from "../_components/typography-row";

export default function TypographyPage() {
  return (
    <AppearanceSectionPage id="typography" preview={<MiniSample />}>
      <div className="flex flex-col gap-3">
        <TypographyRows />
      </div>
    </AppearanceSectionPage>
  );
}
