"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { MiniSample } from "../_components/mini-sample";
import { PassageRows } from "../_components/passage-rows";

export default function TypingAreaPage() {
  return (
    <AppearanceSectionPage id="typing-area" preview={<MiniSample />}>
      <PassageRows />
    </AppearanceSectionPage>
  );
}
