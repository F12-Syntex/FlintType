"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { Keyboard } from "@/app/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/app/_components/keyboard/layouts";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { SectionHeader, SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { BackgroundRow } from "./_components/background-row";
import { BordersRow } from "./_components/borders-row";
import { CaretRow } from "./_components/caret-row";
import { ColorRow } from "./_components/color-row";
import { KeyboardRow } from "./_components/keyboard-row";
import { KeymapRows } from "./_components/keymap-rows";
import { LiveStatsRows } from "./_components/live-stats-rows";
import { MiniSample } from "./_components/mini-sample";
import { PassageRows } from "./_components/passage-rows";
import { RadiusRow } from "./_components/radius-row";
import { ResultRows } from "./_components/result-rows";
import { ThemesRow } from "./_components/themes-row";
import { TypographyRows } from "./_components/typography-row";
import { APPEARANCE_SECTIONS } from "./_sections";

type ColorRowDef = {
  var: ThemeVar;
  label: string;
  desc: string;
  fallbackVar?: `--${string}`;
};

const COLOR_ROWS: readonly ColorRowDef[] = [
  { var: "--primary", label: "Primary accent", desc: "Active states, CTAs, the brand spark" },
  { var: "--primary-foreground", label: "Primary text", desc: "Text rendered on top of the primary accent" },
  { var: "--accent", label: "Highlight tint", desc: "Soft hover backgrounds and accent surfaces" },
  { var: "--accent-foreground", label: "Highlight text", desc: "Text rendered on top of the highlight tint" },
  { var: "--background", label: "Page background", desc: "The main canvas behind every screen" },
  { var: "--foreground", label: "Body text", desc: "Default text color for headlines and prose" },
  { var: "--card", label: "Card surface", desc: "Lifted panels — settings rows, popovers, mode-bar" },
  { var: "--muted", label: "Muted surface", desc: "Sidebars and de-emphasized regions" },
  { var: "--muted-foreground", label: "Muted text", desc: "Captions, eyebrow labels, secondary metadata" },
  { var: "--border", label: "Border", desc: "Hairline dividers and outlines" },
  { var: "--input", label: "Input track", desc: "Form fields and toggle off-state tracks" },
  { var: "--ring", label: "Focus ring", desc: "The outline that wraps a focused element" },
  {
    var: "--ft-passage-typed",
    label: "Practice text",
    desc: "Letters you've already typed in the practice passage. Defaults to the primary accent.",
    fallbackVar: "--primary",
  },
  {
    var: "--ft-passage-untyped",
    label: "Practice text (pending)",
    desc: "Letters not yet typed in the practice passage. Independent of muted text.",
    fallbackVar: "--muted-foreground",
  },
  {
    var: "--ft-passage-error",
    label: "Practice text (error)",
    desc: "Letters mistyped in the practice passage. Defaults to the theme's destructive colour.",
    fallbackVar: "--destructive",
  },
];

/** Each section is rendered inside `<SectionShell>` with its anchor id
 *  matching `_sections.ts`. The sidebar links to `/appearance#<id>`;
 *  the browser scrolls the catch-all customise scroller to this anchor.
 *  `scroll-mt-6` accounts for the small page top padding so the
 *  SectionHeader isn't flush against the previous section's bottom
 *  hairline when an anchor lands here. */
function SectionShell({
  id,
  label,
  preview,
  children,
}: {
  id: string;
  label: string;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-6">
      <SectionHeader label={label} />
      <div className="mb-6 overflow-hidden rounded-md border border-border bg-background">
        {preview}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function KeyboardLivePreview() {
  const { settings } = useKeyboardSettings();
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <Keyboard
        settingsOverride={settings}
        forcedPressed={new Set(["KeyF", "KeyJ", "KeyK"])}
        mode="static"
        scale={0.85}
      />
    </div>
  );
}

function KeymapLivePreview() {
  const { prefs } = useAppearancePrefs();
  if (prefs.keymap === "off") {
    return (
      <div className="flex min-h-[180px] items-center justify-center px-4 py-8 text-sm text-muted-foreground">
        Keymap is off — pick another mode below to see it appear.
      </div>
    );
  }
  // Narrow the user-editable keymapLayout (typed string) back to LayoutId,
  // falling back to qwerty when an unknown value lands.
  const layoutId: LayoutId =
    prefs.keymapLayout in LAYOUTS ? (prefs.keymapLayout as LayoutId) : "qwerty";
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <Keyboard
        layout={layoutId}
        mode={prefs.keymap === "static" ? "static" : "react"}
        legend={prefs.keymapLegend}
        topRow={prefs.keymapTopRow}
        scale={Math.min(prefs.keymapSize, 1)}
        forcedPressed={new Set(["KeyF", "KeyJ", "KeyD", "KeyK"])}
        settingsOverride={{ compact: prefs.keymapCompact }}
      />
    </div>
  );
}

function ResultLivePreview() {
  const { prefs } = useAppearancePrefs();
  const speed = sampleSpeed(prefs.typingSpeedUnit);
  const formatted = prefs.alwaysShowDecimal
    ? speed.toFixed(2)
    : Math.round(speed).toString();
  const acc = prefs.alwaysShowDecimal ? "96.40" : "96";

  // Sample run with realistic dips so the chart shows actual variance.
  const points = [42, 58, 64, 71, 75, 78, 84, 88, 92, 95, 89, 96, 102, 100, 98];
  const minY = prefs.startGraphsAtZero ? 0 : Math.min(...points) - 5;
  const maxY = Math.max(...points) + 5;
  const W = 320;
  const H = 96;
  const stepX = W / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = (i * stepX).toFixed(1);
      const y = (H - ((p - minY) / (maxY - minY)) * H).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-wrap items-baseline gap-6 font-mono">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {prefs.typingSpeedUnit.toUpperCase()}
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-primary">
            {formatted}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Accuracy
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
            {acc}%
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Time
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
            30s
          </span>
        </div>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={H - 0.5}
          x2={W}
          y2={H - 0.5}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {prefs.startGraphsAtZero
          ? "Y-axis floored at 0"
          : "Y-axis auto-fits the data"}
      </span>
    </div>
  );
}

function sampleSpeed(unit: string): number {
  switch (unit) {
    case "cpm":
      return 98 * 5;
    case "wps":
      return 98 / 60;
    case "cps":
      return (98 * 5) / 60;
    case "wph":
      return 98 * 60;
    default:
      return 98;
  }
}

function sectionLabel(id: string): string {
  return APPEARANCE_SECTIONS.find((s) => s.id === id)?.name ?? id;
}

export default function AppearancePage() {
  const { overrides, setVar, clearVar, reset } = useThemeOverrides();
  const { customizedCount: appearanceCustomized, reset: resetAppearance } =
    useAppearancePrefs();
  const customizedCount =
    Object.keys(overrides).length + appearanceCustomized;

  function handleResetAll() {
    reset();
    resetAppearance();
  }

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        title="Appearance"
        customizedCount={customizedCount}
        onResetAll={handleResetAll}
        description="Every visual control with its own live preview. The sidebar jumps you to the section; nothing here is hidden behind a sub-page."
      />

      {/* ─── Themes & mode ─── */}
      <SectionShell
        id="themes"
        label={sectionLabel("themes")}
        preview={<MiniSample />}
      >
        <ThemesRow />
        <SettingsRow label="Mode" control={<ModeSwitcher />} />
        <div>
          <Link
            href="/app/customise/appearance/themes"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse all palettes
            <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </SectionShell>

      {/* ─── Colors ─── */}
      <SectionShell
        id="colors"
        label={sectionLabel("colors")}
        preview={<MiniSample />}
      >
        {COLOR_ROWS.map((row) => (
          <ColorRow
            key={row.var}
            label={row.label}
            desc={row.desc}
            swatchColor={
              row.fallbackVar
                ? `var(${row.var}, var(${row.fallbackVar}))`
                : `var(${row.var})`
            }
            value={overrides[row.var]}
            onChange={(hex) => setVar(row.var, hex)}
            onClear={() => clearVar(row.var)}
          />
        ))}
      </SectionShell>

      {/* ─── Geometry ─── */}
      <SectionShell
        id="geometry"
        label={sectionLabel("geometry")}
        preview={<MiniSample />}
      >
        <RadiusRow
          value={overrides["--radius"]}
          onChange={(rem) => setVar("--radius", `${rem}rem`)}
          onClear={() => clearVar("--radius")}
        />
        <BordersRow />
      </SectionShell>

      {/* ─── Caret & cursor ─── */}
      <SectionShell
        id="caret"
        label={sectionLabel("caret")}
        preview={<MiniSample />}
      >
        <CaretRow />
      </SectionShell>

      {/* ─── Typography ─── */}
      <SectionShell
        id="typography"
        label={sectionLabel("typography")}
        preview={<MiniSample />}
      >
        <TypographyRows />
      </SectionShell>

      {/* ─── Keyboard ─── */}
      <SectionShell
        id="keyboard"
        label={sectionLabel("keyboard")}
        preview={<KeyboardLivePreview />}
      >
        <KeyboardRow />
      </SectionShell>

      {/* ─── Background ─── */}
      <SectionShell
        id="background"
        label={sectionLabel("background")}
        preview={<MiniSample />}
      >
        <BackgroundRow />
      </SectionShell>

      {/* ─── Live stats ─── */}
      <SectionShell
        id="live-stats"
        label={sectionLabel("live-stats")}
        preview={<MiniSample />}
      >
        <LiveStatsRows />
      </SectionShell>

      {/* ─── Typing area ─── */}
      <SectionShell
        id="typing-area"
        label={sectionLabel("typing-area")}
        preview={<MiniSample />}
      >
        <PassageRows />
      </SectionShell>

      {/* ─── Result ─── */}
      <SectionShell
        id="result"
        label={sectionLabel("result")}
        preview={<ResultLivePreview />}
      >
        <ResultRows />
      </SectionShell>

      {/* ─── Keymap ─── */}
      <SectionShell
        id="keymap"
        label={sectionLabel("keymap")}
        preview={<KeymapLivePreview />}
      >
        <KeymapRows />
      </SectionShell>
    </section>
  );
}
