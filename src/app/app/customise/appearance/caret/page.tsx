"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { CaretRow } from "../_components/caret-row";
import { CaretPreview } from "../_previews/caret";

export default function CaretPage() {
  return (
    <AppearanceSectionPage id="caret" preview={<CaretPreview />}>
      <div className="flex flex-col gap-3">
        <CaretRow />
      </div>
    </AppearanceSectionPage>
  );
}
