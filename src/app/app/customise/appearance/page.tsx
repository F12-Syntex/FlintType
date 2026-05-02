"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColorPresetPicker } from "@/components/ui/color-preset-picker";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { SettingsRow } from "../_components/row";
import { BackgroundRow } from "./_components/background-row";
import { CaretRow } from "./_components/caret-row";
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
    <Card className="rounded-md shadow-sm ring-border min-h-16">
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
      <header className="mb-6 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Section
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-2 text-[0.65rem]">
              {COLOR_ROWS.length + 5} options
            </Badge>
            {customizedCount > 0 ? (
              <Badge className="px-2 text-[0.65rem]">
                {customizedCount} customized
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              disabled={customizedCount === 0}
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Tweak any surface, color, or shape — changes apply instantly and stay
        with you across reloads. Hit <span className="font-medium text-foreground">Reset all</span> to
        return to the defaults at any time.
      </p>

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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span aria-hidden className="inline-block h-px w-5 bg-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h3>
    </div>
  );
}
