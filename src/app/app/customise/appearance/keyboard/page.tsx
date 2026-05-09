"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { KeyboardRow } from "../_components/keyboard-row";
import { KeyboardPreview } from "../_previews/keyboard";

export default function KeyboardPage() {
  return (
    <AppearanceSectionPage id="keyboard" preview={<KeyboardPreview />}>
      <div className="flex flex-col gap-3">
        <KeyboardRow />
      </div>
    </AppearanceSectionPage>
  );
}
