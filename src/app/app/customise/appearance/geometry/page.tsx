"use client";

import { useThemeOverrides } from "@/lib/theme-customization";
import { AppearanceSectionPage } from "../_components/section-page";
import { BordersRow } from "../_components/borders-row";
import { RadiusRow } from "../_components/radius-row";
import { GeometryPreview } from "../_previews/geometry";

export default function GeometryPage() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  return (
    <AppearanceSectionPage id="geometry" preview={<GeometryPreview />}>
      <div className="flex flex-col gap-3">
        <RadiusRow
          value={overrides["--radius"]}
          onChange={(rem) => setVar("--radius", `${rem}rem`)}
          onClear={() => clearVar("--radius")}
        />
        <BordersRow />
      </div>
    </AppearanceSectionPage>
  );
}
