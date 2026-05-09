"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { TypographyRows } from "../_components/typography-row";
import { TypographyPreview } from "../_previews/typography";

export default function TypographyPage() {
  return (
    <AppearanceSectionPage id="typography" preview={<TypographyPreview />}>
      <div className="flex flex-col gap-3">
        <TypographyRows />
      </div>
    </AppearanceSectionPage>
  );
}
