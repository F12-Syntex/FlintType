"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";
import { overrideCount } from "@/lib/themes/overrides";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { SettingsSection } from "../_components/settings-section";
import { BackgroundRow } from "./_components/background-row";
import { BordersRow } from "./_components/borders-row";
import { CaretRow } from "./_components/caret-row";
import {
  AutoHideRow,
  FocusShortcutHint,
  FooterStyleRow,
  ModeBarStyleRow,
  TopbarStyleRow,
} from "./_components/chrome-rows";
import { ColorRow } from "./_components/color-row";
import { KeyboardRow } from "./_components/keyboard-row";
import { KeymapRows } from "./_components/keymap-rows";
import { MistakesRows } from "./_components/mistakes-row";
import { MultiplayerRows } from "./_components/multiplayer-rows";
import { LiveStatsRows } from "./_components/live-stats-rows";
import { PassageRows } from "./_components/passage-rows";
import { PreviewPane } from "./_components/preview-pane";
import { RadiusRow } from "./_components/radius-row";
import { ResultRows } from "./_components/result-rows";
import { useSectionChanges } from "./_components/section-changes";
import {
  BackgroundFillRow,
  CardSurfacesRow,
  DividersRow,
  MonochromeRow,
  PagePaddingRow,
  SurfacePresetRow,
} from "./_components/surface-rows";
import { TapeRows } from "./_components/tape-row";
import { ThemesRow } from "./_components/themes-row";
import { TypographyRows } from "./_components/typography-row";
import { useActiveAppearanceSection } from "./_components/use-active-section";

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

/** Resolve a colour token to the value the cascade currently shows.
 *  Themes + per-var overrides paint onto `<html>`, so `var(--x)` reads
 *  the active palette directly; the only thing we still want to honour
 *  here is the passage-specific tokens that default to a different
 *  base var (e.g. `--ft-passage-typed` → `--primary`) when the user
 *  hasn't picked their own colour. */
function resolveSwatchColor(
  varName: ThemeVar,
  fallbackVar: `--${string}` | undefined,
): string {
  return fallbackVar
    ? `var(${varName}, var(${fallbackVar}))`
    : `var(${varName})`;
}

export default function AppearancePage() {
  const { overrides, setVar, clearVar, reset } = useThemeOverrides();
  const { customizedCount: appearanceCustomized, reset: resetAppearance } =
    useAppearancePrefs();
  const customizedCount = overrideCount(overrides) + appearanceCustomized;
  const changed = useSectionChanges();
  const activeId = useActiveAppearanceSection(true);

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
        description="One live preview, always on, follows whatever you're tuning and repaints from the real test surface. A coral dot marks every section you've changed."
      />

      {/* Two-pane: scrollable controls + the persistent live preview. The
          preview rides the top of the stack on mobile / lg and docks into
          a sticky right column at xl, where there's honest room for both
          beside the section nav rail. */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-10">
        <div className="order-1 xl:order-2 xl:sticky xl:top-4">
          <PreviewPane
            activeId={activeId}
            changed={changed}
            customizedCount={customizedCount}
          />
        </div>

        <div className="order-2 flex flex-col xl:order-1">
          <SettingsSection
            id="themes"
            eyebrow="Surface"
            title="Themes & mode"
            changed={changed.themes}
            description="Pick a community palette and flip light / dark. Every palette swap repaints the live preview."
          >
            <ThemesRow />
            <SettingsRow label="Mode" control={<ModeSwitcher />} />
            <div>
              <Link
                href="/customise/appearance/themes"
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
            changed={changed.colors}
            description="Override the active palette one CSS variable at a time."
          >
            {COLOR_ROWS.map((row) => (
              <ColorRow
                key={row.var}
                label={row.label}
                desc={row.desc}
                swatchColor={resolveSwatchColor(row.var, row.fallbackVar)}
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
            changed={changed.geometry}
            description="Corner radius and the borders rule across the app. Every component honours these — the passage card, buttons, chips, popovers."
          >
            <RadiusRow
              value={overrides["--radius"]}
              onChange={(rem) => setVar("--radius", `${rem}rem`)}
              onClear={() => clearVar("--radius")}
            />
            <BordersRow />
          </SettingsSection>

          <SettingsSection
            id="surface"
            eyebrow="Minimise"
            title="Surface"
            changed={changed.surface}
            description="Collapse card surfaces, dividers, padding, background — the dial that takes flinttype from editorial paper to a Monkeytype-leaning minimal sheet. Presets ship three calibrated bundles."
          >
            <SurfacePresetRow />
            <CardSurfacesRow />
            <DividersRow />
            <PagePaddingRow />
            <BackgroundFillRow />
            <MonochromeRow />
          </SettingsSection>

          <SettingsSection
            id="chrome"
            eyebrow="Layer"
            title="Chrome"
            changed={changed.chrome}
            description="Topbar, footer, mode bar style + auto-hide while typing. Tune how much of the app gets out of the way during a run."
          >
            <TopbarStyleRow />
            <FooterStyleRow />
            <ModeBarStyleRow />
            <AutoHideRow />
            <FocusShortcutHint />
          </SettingsSection>

          <SettingsSection
            id="caret"
            eyebrow="Cursor"
            title="Caret & cursor"
            changed={changed.caret}
            description="Style, thickness, roundness, blink, smooth-motion — the marker that follows your typing. The preview runs the real caret on a frozen passage so every option (including blink and smooth) plays there."
          >
            <CaretRow />
          </SettingsSection>

          <SettingsSection
            id="mistakes"
            eyebrow="Feedback"
            title="Mistakes"
            changed={changed.mistakes}
            description="How a mistyped letter in the current word is shown. Every option paints the letter in your error colour — pick whether to stop there or stack a bold weight, underline, or background highlight on top. Past errored words are governed by 'Mark incomplete words' under Typing area."
          >
            <MistakesRows />
          </SettingsSection>

          <SettingsSection
            id="typography"
            eyebrow="Type"
            title="Typography"
            changed={changed.typography}
            description="Font family, size, and word spacing of the practice passage. Body text and chrome stay on JetBrains Mono — only the passage changes."
          >
            <TypographyRows />
          </SettingsSection>

          <SettingsSection
            id="keyboard"
            eyebrow="Visual"
            title="Keyboard widget"
            changed={changed.keyboard}
            description="The live keyboard rendered under the passage. Every option here repaints the preview instantly."
          >
            <KeyboardRow />
          </SettingsSection>

          <SettingsSection
            id="background"
            eyebrow="Canvas"
            title="Background"
            changed={changed.background}
            description="Drop in an image, pick how it fits, and tune opacity. Local to your browser — nothing uploads."
          >
            <BackgroundRow />
          </SettingsSection>

          <SettingsSection
            id="live-stats"
            eyebrow="Heads-up"
            title="Live stats"
            changed={changed["live-stats"]}
            description="WPM and accuracy ticker rendered alongside the passage. Colour, opacity, style (off / text / mini / flash), unit and decimal toggle all reflect in the real Readouts strip."
          >
            <LiveStatsRows />
          </SettingsSection>

          <SettingsSection
            id="typing-area"
            eyebrow="Surface"
            title="Typing area"
            changed={changed["typing-area"]}
            description="Line count and max width of the passage. The preview is the same component the test screen runs — every toggle moves it live."
          >
            <PassageRows />
          </SettingsSection>

          <SettingsSection
            id="tape"
            eyebrow="Layout"
            title="Tape mode"
            changed={changed.tape}
            description="One scrolling line. Word scrolls per word, Letter scrolls per keypress. Best with smooth scroll + a mono font."
          >
            <TapeRows />
          </SettingsSection>

          <SettingsSection
            id="result"
            eyebrow="Outcome"
            title="Result screen"
            changed={changed.result}
            description="What the post-test screen shows. The preview embeds the real result components (BigStats and WpmTrace) so the layout, type ramp, and chart shape are exactly what the user sees after a run."
          >
            <ResultRows />
          </SettingsSection>

          <SettingsSection
            id="keymap"
            eyebrow="Layout"
            title="Keymap"
            changed={changed.keymap}
            description="Hand-layout that powers the heatmap and ergonomic stats. The preview reacts to every keymap setting; switching layout swaps the legend live."
          >
            <KeymapRows />
          </SettingsSection>

          <SettingsSection
            id="multiplayer"
            eyebrow="Race"
            title="Multiplayer"
            changed={changed.multiplayer}
            description="How live opponents read in /race — the 1v1 bot race and free-for-all lobbies. Visuals here only affect surfaces with more than one racer."
          >
            <MultiplayerRows />
          </SettingsSection>
        </div>
      </div>
    </section>
  );
}
