"use client";

import { useThemeOverrides } from "@/lib/theme-customization";
import { AppearanceSectionPage } from "../_components/section-page";
import { BordersRow } from "../_components/borders-row";
import { MiniSample } from "../_components/mini-sample";
import { RadiusRow } from "../_components/radius-row";

export default function GeometryPage() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  return (
    <AppearanceSectionPage id="geometry" preview={<MiniSample />}>
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
