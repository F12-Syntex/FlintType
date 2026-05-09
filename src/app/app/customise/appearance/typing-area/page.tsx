"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { PassageRows } from "../_components/passage-rows";
import { TypingAreaPreview } from "../_previews/typing-area";

export default function TypingAreaPage() {
  return (
    <AppearanceSectionPage id="typing-area" preview={<TypingAreaPreview />}>
      <PassageRows />
    </AppearanceSectionPage>
  );
}
