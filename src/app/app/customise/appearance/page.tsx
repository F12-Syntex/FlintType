"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { Keyboard } from "@/app/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/app/_components/keyboard/layouts";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { SettingsSection } from "../_components/settings-section";
import { BackgroundRow } from "./_components/background-row";
import { BordersRow } from "./_components/borders-row";
import { CaretRow } from "./_components/caret-row";
import { ColorRow } from "./_components/color-row";
import { KeyboardRow } from "./_components/keyboard-row";
import { KeymapRows } from "./_components/keymap-rows";
import { LiveStatsRows } from "./_components/live-stats-rows";
import { PassageRows } from "./_components/passage-rows";
import { RadiusRow } from "./_components/radius-row";
import { ResultRows } from "./_components/result-rows";
import {
  BackgroundPreview,
  CaretPreview,
  ColorPreview,
  GeometryPreview,
  LiveStatsPreview,
  ThemePreview,
  TypingAreaPreview,
  TypographyPreview,
} from "./_components/section-previews";
import { ThemesRow } from "./_components/themes-row";
import { TypographyRows } from "./_components/typography-row";

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
        eyebrow="Customise · Appearance"
        title="Make it look the way you think"
        customizedCount={customizedCount}
        onResetAll={handleResetAll}
        description="Every visual control with its own live preview. The sidebar jumps you to the section; nothing here is hidden behind a sub-page."
      />

      <SettingsSection
        id="themes"
        eyebrow="Surface"
        title="Themes & mode"
        description="Pick a community palette and flip light / dark. Switching wipes per-token colour overrides — the dialog gives you an export first."
        preview={<ThemePreview />}
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
      </SettingsSection>

      <SettingsSection
        id="colors"
        eyebrow="Tokens"
        title="Colors"
        description="Override the active palette one CSS variable at a time. Each row picks its own swatch and shows the swap on the practice text live."
        preview={<ColorPreview />}
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
      </SettingsSection>

      <SettingsSection
        id="geometry"
        eyebrow="Shape"
        title="Geometry"
        description="Corner radius and the borders rule across the app. Every component honours these — buttons, cards, popovers, the keyboard widget."
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
        id="caret"
        eyebrow="Cursor"
        title="Caret & cursor"
        description="Style, thickness, roundness — the marker that follows your typing. Blink and smooth-motion are temporal; their effect lives at the test screen, not in this preview."
        preview={<CaretPreview />}
      >
        <CaretRow />
      </SettingsSection>

      <SettingsSection
        id="typography"
        eyebrow="Type"
        title="Typography"
        description="Font family, size, and word spacing of the practice passage. Body text and chrome stay on JetBrains Mono — only the passage changes."
        preview={<TypographyPreview />}
      >
        <TypographyRows />
      </SettingsSection>

      <SettingsSection
        id="keyboard"
        eyebrow="Visual"
        title="Keyboard widget"
        description="The live keyboard rendered under the passage. Every option here repaints the preview above instantly."
        preview={<KeyboardLivePreview />}
      >
        <KeyboardRow />
      </SettingsSection>

      <SettingsSection
        id="background"
        eyebrow="Canvas"
        title="Background"
        description="Drop in an image, pick how it fits, and tune opacity. Local to your browser — nothing uploads."
        preview={<BackgroundPreview />}
      >
        <BackgroundRow />
      </SettingsSection>

      <SettingsSection
        id="live-stats"
        eyebrow="Heads-up"
        title="Live stats"
        description="WPM and accuracy ticker rendered alongside the passage. Colour and opacity match how loud you want them while typing."
        preview={<LiveStatsPreview />}
      >
        <LiveStatsRows />
      </SettingsSection>

      <SettingsSection
        id="typing-area"
        eyebrow="Surface"
        title="Typing area"
        description="Line count, max width, tape vs free-flow. The dotted region is the canvas; the inner card is where text actually lands."
        preview={<TypingAreaPreview />}
      >
        <PassageRows />
      </SettingsSection>

      <SettingsSection
        id="result"
        eyebrow="Outcome"
        title="Result screen"
        description="What the post-test screen shows — the headline numbers, the chart axis, the unit your speed reads in."
        preview={<ResultLivePreview />}
      >
        <ResultRows />
      </SettingsSection>

      <SettingsSection
        id="keymap"
        eyebrow="Layout"
        title="Keymap"
        description="Hand-layout that powers the heatmap and ergonomic stats. The preview reacts to every keymap setting; switching layout swaps the legend live."
        preview={<KeymapLivePreview />}
      >
        <KeymapRows />
      </SettingsSection>
    </section>
  );
}
