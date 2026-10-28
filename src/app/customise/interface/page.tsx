"use client";

import {
  DEFAULT_APPEARANCE,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { useThemeOverrides } from "@/lib/theme-customization";
import {
  countCustomised,
  countOverriddenVars,
  getGroup,
  GROUP_APPEARANCE_KEYS,
  GROUP_THEME_VARS,
  sectionTitle,
} from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { BordersRow } from "../_components/rows/borders-row";
import {
  AutoHideRow,
  FocusShortcutHint,
  FooterStyleRow,
  TopbarStyleRow,
} from "../_components/rows/chrome-rows";
import { RadiusRow } from "../_components/rows/radius-row";
import {
  ChromePreview,
  GeometryPreview,
  SurfacePreview,
} from "../_components/rows/section-previews";
import {
  BackgroundFillRow,
  CardSurfacesRow,
  DividersRow,
  MonochromeRow,
  PagePaddingRow,
  SurfacePresetRow,
} from "../_components/rows/surface-rows";
import { StylePreview } from "../_components/rows/style-preview";
import {
  ButtonGlowRow,
  ControlShapeRow,
  DepthRow,
  PageAuraRow,
  UiFontRow,
  UiScaleRow,
} from "../_components/rows/style-rows";
import { SettingsSection } from "../_components/settings-section";

export default function InterfaceSettingsPage() {
  const group = getGroup("interface");
  const { prefs, resetKeys } = useAppearancePrefs();
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const appearanceKeys = GROUP_APPEARANCE_KEYS.interface ?? [];
  const shapeVars = GROUP_THEME_VARS.interface ?? [];

  const customizedCount =
    countCustomised(prefs, DEFAULT_APPEARANCE, appearanceKeys) +
    countOverriddenVars(overrides, shapeVars);

  function handleReset() {
    resetKeys(appearanceKeys);
    for (const v of shapeVars) clearVar(v);
  }

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={handleReset}
      />

      <SettingsSection
        id="style"
        title={sectionTitle(group, "style")}
        description="Shape, depth, glow and type across the whole app."
        preview={<StylePreview />}
      >
        <ControlShapeRow />
        <DepthRow />
        <ButtonGlowRow />
        <PageAuraRow />
        <UiFontRow />
        <UiScaleRow />
      </SettingsSection>

      <SettingsSection
        id="surface"
        title={sectionTitle(group, "surface")}
        description="Start from a preset, then tune each part."
        preview={<SurfacePreview />}
      >
        <SurfacePresetRow />
        <CardSurfacesRow />
        <DividersRow />
        <PagePaddingRow />
        <BackgroundFillRow />
        <MonochromeRow />
      </SettingsSection>

      <SettingsSection
        id="geometry"
        title={sectionTitle(group, "geometry")}
        description="How round and how outlined things are across the app."
        preview={<GeometryPreview />}
      >
        <RadiusRow
          value={overrides["--radius"]}
          onChange={(rem) => setVar("--radius", `${rem}rem`)}
          onClear={() => clearVar("--radius")}
        />
        <BordersRow />
      </SettingsSection>

      <SettingsSection
        id="chrome"
        title={sectionTitle(group, "chrome")}
        description="How much of the app steps aside while you type."
        preview={<ChromePreview />}
      >
        <TopbarStyleRow />
        <FooterStyleRow />
        <AutoHideRow />
        <FocusShortcutHint />
      </SettingsSection>
    </div>
  );
}
