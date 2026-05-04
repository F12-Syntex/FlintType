"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { SectionHeader, SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { BackgroundRow } from "./_components/background-row";
import { CaretRow } from "./_components/caret-row";
import { ColorRow } from "./_components/color-row";
import { KeyboardRow } from "./_components/keyboard-row";
import { KeymapRows } from "./_components/keymap-rows";
import { LiveStatsRows } from "./_components/live-stats-rows";
import { PassageRows } from "./_components/passage-rows";
import { RadiusRow } from "./_components/radius-row";
import { ResultRows } from "./_components/result-rows";
import { ThemesRow } from "./_components/themes-row";
import { TypographyRows } from "./_components/typography-row";

// ─── Color section ─────────────────────────────────────────────────

type ColorRowDef = {
  var: ThemeVar;
  label: string;
  desc: string;
};

const COLOR_ROWS: readonly ColorRowDef[] = [
  {
    var: "--primary",
    label: "Primary accent",
    desc: "Active states, CTAs, the brand spark",
  },
  {
    var: "--primary-foreground",
    label: "Primary text",
    desc: "Text rendered on top of the primary accent",
  },
  {
    var: "--accent",
    label: "Highlight tint",
    desc: "Soft hover backgrounds and accent surfaces",
  },
  {
    var: "--accent-foreground",
    label: "Highlight text",
    desc: "Text rendered on top of the highlight tint",
  },
  {
    var: "--background",
    label: "Page background",
    desc: "The main canvas behind every screen",
  },
  {
    var: "--foreground",
    label: "Body text",
    desc: "Default text color for headlines and prose",
  },
  {
    var: "--card",
    label: "Card surface",
    desc: "Lifted panels — settings rows, popovers, mode-bar",
  },
  {
    var: "--muted",
    label: "Muted surface",
    desc: "Sidebars and de-emphasized regions",
  },
  {
    var: "--muted-foreground",
    label: "Muted text",
    desc: "Captions, eyebrow labels, secondary metadata",
  },
  {
    var: "--border",
    label: "Border",
    desc: "Hairline dividers and outlines",
  },
  {
    var: "--input",
    label: "Input track",
    desc: "Form fields and toggle off-state tracks",
  },
  {
    var: "--ring",
    label: "Focus ring",
    desc: "The outline that wraps a focused element",
  },
];

// ColorRow lives in ./_components/color-row.tsx so the live-stats
// row in live-stats-rows.tsx can reuse the same affordance — ui-law
// §12 mandates a uniform colour-picker pattern across the page.

// ─── Page ──────────────────────────────────────────────────────────

export default function AppearancePage() {
  const { overrides, setVar, clearVar, reset } = useThemeOverrides();
  const {
    customizedCount: appearanceCustomized,
    reset: resetAppearance,
  } = useAppearancePrefs();
  // Reset all clears every per-var theme override (colors, font, radius)
  // *and* every appearance pref (live stats, passage, result, keymap).
  // The active theme stays put — switching theme is its own deliberate
  // action via the Theme picker.
  const customizedCount = Object.keys(overrides).length + appearanceCustomized;

  function handleResetAll() {
    reset();
    resetAppearance();
  }

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        title="Appearance"
        optionsCount={COLOR_ROWS.length + 6}
        customizedCount={customizedCount}
        onResetAll={handleResetAll}
        description="Tweak any surface, color, or shape — changes apply instantly and stay with you across reloads."
      />

      <SectionHeader label="Themes" />
      <div className="mb-8 flex flex-col gap-3">
        <ThemesRow />
        <SettingsRow label="Mode" control={<ModeSwitcher />} />
      </div>

      <SectionHeader label="Colors" />
      <div className="mb-8 flex flex-col gap-3">
        {COLOR_ROWS.map((row) => (
          <ColorRow
            key={row.var}
            label={row.label}
            desc={row.desc}
            swatchColor={`var(${row.var})`}
            value={overrides[row.var]}
            onChange={(hex) => setVar(row.var, hex)}
            onClear={() => clearVar(row.var)}
          />
        ))}
      </div>

      <SectionHeader label="Geometry" />
      <div className="mb-8 flex flex-col gap-3">
        <RadiusRow
          value={overrides["--radius"]}
          onChange={(rem) => setVar("--radius", `${rem}rem`)}
          onClear={() => clearVar("--radius")}
        />
      </div>

      <SectionHeader label="Caret &amp; cursor" />
      <div className="mb-8 flex flex-col gap-3">
        <CaretRow />
      </div>

      <SectionHeader label="Typography" />
      <div className="mb-8 flex flex-col gap-3">
        <TypographyRows />
      </div>

      <SectionHeader label="Keyboard" />
      <div className="mb-8 flex flex-col gap-3">
        <KeyboardRow />
      </div>

      <SectionHeader label="Background" />
      <div className="mb-8 flex flex-col gap-3">
        <BackgroundRow
          bgImage={overrides["--ft-bg-image"]}
          onSetImage={(v) => setVar("--ft-bg-image", v)}
          onClearImage={() => clearVar("--ft-bg-image")}
        />
      </div>

      <SectionHeader label="Live stats" />
      <div className="mb-8">
        <LiveStatsRows />
      </div>

      <SectionHeader label="Typing area" />
      <div className="mb-8">
        <PassageRows />
      </div>

      <SectionHeader label="Result" />
      <div className="mb-8">
        <ResultRows />
      </div>

      <SectionHeader label="Keymap" />
      <div className="mb-8">
        <KeymapRows />
      </div>
    </section>
  );
}
