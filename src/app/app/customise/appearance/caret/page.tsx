"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { CaretRow } from "../_components/caret-row";
import { MiniSample } from "../_components/mini-sample";

export default function CaretPage() {
  return (
    <AppearanceSectionPage id="caret" preview={<MiniSample />}>
      <div className="flex flex-col gap-3">
        <CaretRow />
      </div>
    </AppearanceSectionPage>
  );
}
