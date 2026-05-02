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
import {
  ColorPicker,
  type ColorPickerValue,
} from "@/components/ui/color-picker";
import { Slider } from "@/components/ui/slider";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { SettingsRow } from "../_components/row";
import { BackgroundRow } from "./_components/background-row";
import { RadiusRow } from "./_components/radius-row";
import { ThemesRow } from "./_components/themes-row";

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
            <ColorPicker
              value={
                swatch && /^#[0-9a-f]{6}$/i.test(swatch)
                  ? (swatch as `#${string}`)
                  : "#888888"
              }
              onValueChange={(v: ColorPickerValue) => onChange(v.hex)}
              hideContrastRatio
            >
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
            </ColorPicker>
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

// ─── Font family ───────────────────────────────────────────────────

const FONT_OPTIONS: ReadonlyArray<{ id: string; label: string; stack: string }> =
  [
    {
      id: "default",
      label: "Plus Jakarta Sans (default)",
      stack: "var(--font-sans)",
    },
    {
      id: "mono",
      label: "IBM Plex Mono",
      stack: "var(--font-mono)",
    },
    {
      id: "serif",
      label: "Lora",
      stack: "var(--font-serif)",
    },
    {
      id: "system",
      label: "System UI",
      stack:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    },
    {
      id: "georgia",
      label: "Georgia",
      stack: "Georgia, 'Times New Roman', serif",
    },
  ];

function FontFamilyRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (stack: string) => void;
  onClear: () => void;
}) {
  // Identify the active option by stack equality so the visual selection
  // survives a remount (cleared override → "default" highlighted again).
  const active =
    FONT_OPTIONS.find((o) => o.stack === value)?.id ?? "default";

  return (
    <Card className="rounded-md shadow-sm ring-border min-h-16">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Font family</CardTitle>
        <CardDescription>
          Pick a face — the sample under each option renders in that font
        </CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-2 px-4 pb-4">
        {FONT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() =>
              opt.id === "default" ? onClear() : onChange(opt.stack)
            }
            className={
              "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors " +
              (active === opt.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted")
            }
            style={{ fontFamily: opt.stack }}
          >
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {opt.label}
            </span>
            <span className="text-xl font-semibold text-foreground">
              The quick brown fox jumps over the lazy dog
            </span>
            <span className="text-sm text-muted-foreground">
              0123456789 — &amp;@#%
            </span>
          </button>
        ))}
        {value !== undefined ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Reset to default
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ─── Font size ─────────────────────────────────────────────────────

const SIZE_PRESETS: ReadonlyArray<{ label: string; scale: number }> = [
  { label: "S", scale: 0.875 },
  { label: "M", scale: 1.0 },
  { label: "L", scale: 1.125 },
  { label: "XL", scale: 1.25 },
];

function FontSizeRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (scale: number) => void;
  onClear: () => void;
}) {
  const scale = value ? Number.parseFloat(value) : 1;

  return (
    <Card className="rounded-md shadow-sm ring-border min-h-16">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Font size</CardTitle>
        <CardDescription>
          Scales every rem-based size across the app — pick a preset or
          fine-tune below
        </CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={Math.abs(p.scale - scale) < 0.01 ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(p.scale)}
            >
              {p.label} <span className="ml-1 opacity-60">{p.scale}×</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Slider
            value={[scale]}
            min={0.75}
            max={1.5}
            step={0.025}
            onValueChange={(v) => {
              if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0]);
            }}
            className="w-60"
          />
          <Badge variant="outline" className="px-2 tabular-nums">
            {scale.toFixed(3)}×
          </Badge>
          {value !== undefined ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Reset
            </Button>
          ) : null}
        </div>
        <div
          className="rounded-md border border-border bg-card p-4"
          style={{ fontSize: `${scale}rem` }}
        >
          <p className="text-base text-foreground">
            Sample paragraph — every rem you read is now at the chosen
            scale. Headlines below scale in proportion.
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Heading sample
          </p>
        </div>
      </div>
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

      <SectionHeader label="Typography" />
      <div className="mb-8 flex flex-col gap-3">
        <FontFamilyRow
          value={overrides["--ft-font-family"]}
          onChange={(stack) => setVar("--ft-font-family", stack)}
          onClear={() => clearVar("--ft-font-family")}
        />
        <FontSizeRow
          value={overrides["--ft-font-scale"]}
          onChange={(scale) => setVar("--ft-font-scale", String(scale))}
          onClear={() => clearVar("--ft-font-scale")}
        />
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
