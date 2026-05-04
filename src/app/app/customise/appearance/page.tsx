"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";
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
import { KeyboardRow } from "./_components/keyboard-row";
import { KeymapRows } from "./_components/keymap-rows";
import { LiveStatsRows } from "./_components/live-stats-rows";
import { PassageRows } from "./_components/passage-rows";
import { RadiusRow } from "./_components/radius-row";
import { ResultRows } from "./_components/result-rows";
import { ThemesRow } from "./_components/themes-row";
import { TypographyRows } from "./_components/typography-row";

// ─── Color section ─────────────────────────────────────────────────

type ColorRow = {
  var: ThemeVar;
  label: string;
  desc: string;
};

const COLOR_ROWS: readonly ColorRow[] = [
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

/** Two layouts that share state:
 *  - Mobile: tight key/value row — label on the left, swatch button
 *    on the right. No description — it duplicates the label on a 375
 *    px screen, and the desktop card already covers it.
 *  - Desktop (sm:+): the original Card with title + description and a
 *    full hex+chevron picker button. */
function ColorRowCard({
  row,
  value,
  onChange,
  onClear,
}: {
  row: ColorRow;
  value: string | undefined;
  onChange: (hex: string) => void;
  onClear: () => void;
}) {
  const swatch = value ?? undefined;
  const customized = value !== undefined;

  return (
    <>
      {/* Mobile only */}
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 sm:hidden">
        <span className="truncate text-sm font-medium text-foreground">
          {row.label}
        </span>
        <div className="flex items-center gap-2">
          {customized ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              Reset
            </Button>
          ) : null}
          <ColorPresetPicker value={value} onChange={onChange}>
            <button
              type="button"
              aria-label={`Pick ${row.label}`}
              className="inline-block h-7 w-7 shrink-0 rounded-sm border border-border shadow-inner ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: `var(${row.var})` }}
            />
          </ColorPresetPicker>
        </div>
      </div>

      {/* Desktop only — original card layout */}
      <Card className="hidden rounded-md shadow-sm ring-border min-h-16 sm:block">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{row.label}</CardTitle>
          <CardDescription>{row.desc}</CardDescription>
          <CardAction>
            <div className="flex items-center gap-3">
              <ColorPresetPicker value={swatch} onChange={onChange}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label={`Pick ${row.label}`}
                >
                  <span
                    className="inline-block h-5 w-5 rounded-sm border border-border shadow-inner"
                    style={{ backgroundColor: `var(${row.var})` }}
                  />
                  {swatch ?? "Default"}
                  <ChevronDown size={14} />
                </Button>
              </ColorPresetPicker>
              {customized ? (
                <Button variant="ghost" size="sm" onClick={onClear}>
                  Reset
                </Button>
              ) : null}
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </>
  );
}

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
          <ColorRowCard
            key={row.var}
            row={row}
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
