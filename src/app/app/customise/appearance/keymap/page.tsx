"use client";

import { AppearanceSectionPage } from "../_components/section-page";
import { KeymapRows } from "../_components/keymap-rows";
import { KeymapPreview } from "../_previews/keymap";

export default function KeymapPage() {
  return (
    <AppearanceSectionPage id="keymap" preview={<KeymapPreview />}>
      <KeymapRows />
    </AppearanceSectionPage>
  );
}
