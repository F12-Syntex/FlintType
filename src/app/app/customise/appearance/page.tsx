"use client";

import { Button } from "@/components/ui/button";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";
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
import { RadiusRow } from "./_components/radius-row";
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

/** Color rows are a tight one-line affordance: swatch as the trigger,
 *  label next to it, hex (when customised) and a small Reset on the
 *  right. No CardHeader / CardDescription — the description repeated
 *  what the label already says, especially on a small screen. */
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
  const customized = value !== undefined;

  return (
    <div className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
      <ColorPresetPicker value={value} onChange={onChange}>
        <button
          type="button"
          aria-label={`Pick ${row.label}`}
          className="inline-block h-7 w-7 shrink-0 rounded-sm border border-border shadow-inner ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ backgroundColor: `var(${row.var})` }}
        />
      </ColorPresetPicker>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {row.label}
        </span>
        {customized ? (
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {value}
          </span>
        ) : null}
      </div>
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
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function AppearancePage() {
  const { overrides, setVar, clearVar, reset } = useThemeOverrides();
  // Reset all only clears per-var overrides (colors, font, radius). The
  // active theme stays put — switching theme is its own deliberate
  // action via the Theme picker.
  const customizedCount = Object.keys(overrides).length;

  function handleResetAll() {
    reset();
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
    </section>
  );
}
