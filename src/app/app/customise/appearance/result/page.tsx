"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { ResultRows } from "../_components/result-rows";
import { ResultPreview } from "../_previews/result";

export default function ResultPage() {
  return (
    <AppearanceSectionPage id="result" preview={<ResultPreview />}>
      <ResultRows />
    </AppearanceSectionPage>
  );
}
