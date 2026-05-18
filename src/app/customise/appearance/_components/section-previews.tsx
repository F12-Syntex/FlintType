"use client";

import { Button } from "@/components/ui/button";
import { Keyboard } from "@/app/_components/keyboard";
import { LAYOUTS, type LayoutId } from "@/app/_components/keyboard/layouts";
import { Passage } from "@/app/_components/passage";
import { MobileReadouts, Readouts } from "@/app/_components/readouts";
import { TestSummary } from "@/app/_components/test-summary";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { PreviewPracticeProvider } from "../../_components/preview-practice";

/** Section previews that mount the *real* on-page components inside a
 *  read-only practice context (`<PreviewPracticeProvider>`). Every
 *  override the user makes propagates 1:1 because the components are
 *  the same ones running on /app — no parallel rendering, no mocked
 *  visuals. */

/* ─── Shared height-bounded surface ─────────────────────────────── */

/** Wrap the real <Passage /> in a height-bounded card so it sits
 *  inside the preview pane. Internal clipping does the right thing —
 *  font-scale grows the text and fewer lines fit; smaller scale shows
 *  more. That *is* the 1:1 reflection. */
function PreviewSurface({
  height = "h-[180px]",
  withReadouts = false,
}: {
  height?: string;
  withReadouts?: boolean;
}) {
  return (
    <PreviewPracticeProvider>
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {withReadouts ? (
          <>
            <div className="md:hidden">
              <MobileReadouts />
            </div>
            <div className="hidden md:block">
              <Readouts />
            </div>
          </>
        ) : null}
        <div className={`relative w-full ${height}`}>
          <Passage />
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}

/* ─── Themes & mode ────────────────────────────────────────────── */

export function ThemePreview() {
  // The whole passage paints in the active palette — typed/untyped/
  // error tokens, the chrome, the caret. One real surface gives the
  // best read on a theme swap.
  return <PreviewSurface />;
}

/* ─── Colors ───────────────────────────────────────────────────── */

export function ColorPreview() {
  // Readouts on top + passage below — covers every colour token the
  // user can override (typed, untyped, error, primary, foreground,
  // muted-foreground, border, card, accent, ring).
  return <PreviewSurface withReadouts />;
}

/* ─── Geometry ─────────────────────────────────────────────────── */

export function GeometryPreview() {
  // Radius shows up everywhere — the passage card, buttons, chips,
  // popovers. A passage + a button row covers both surfaces.
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
      <PreviewPracticeProvider>
        <div className="relative h-[140px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button size="sm">Action</Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <span className="inline-flex h-7 items-center rounded-md border border-border bg-muted px-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Chip
        </span>
      </div>
    </div>
  );
}

/* ─── Caret & cursor ───────────────────────────────────────────── */

export function CaretPreview() {
  // Real Passage with phase=running shows the live caret — every
  // setting (style, thickness, roundness, blink, smooth) flows
  // through to the real CaretGlyph the test uses.
  return <PreviewSurface />;
}

/* ─── Typography ───────────────────────────────────────────────── */

export function TypographyPreview() {
  return <PreviewSurface />;
}

/* ─── Background ───────────────────────────────────────────────── */

export function BackgroundPreview() {
  const { prefs } = useBackgroundPrefs();
  const hasImage = prefs.imageUrl.length > 0;

  // Frame the real passage inside a background-painted shell so the
  // user sees the image (or fallback) actually behind their typing
  // surface — same composition as /app.
  return (
    <div className="px-5 py-5 sm:px-6 sm:py-6">
      <div
        className="relative overflow-hidden rounded-md border border-foreground/15"
        style={
          hasImage
            ? {
                backgroundImage: `url("${prefs.imageUrl}")`,
                backgroundSize:
                  prefs.fit === "tile"
                    ? "auto"
                    : prefs.fit === "auto"
                      ? "auto"
                      : prefs.fit,
                backgroundRepeat:
                  prefs.fit === "tile" ? "repeat" : "no-repeat",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <PreviewPracticeProvider>
          <div className="bg-background/80 px-4 py-4 backdrop-blur-sm">
            <div className="relative h-[140px] w-full">
              <Passage />
            </div>
          </div>
        </PreviewPracticeProvider>
      </div>
    </div>
  );
}

/* ─── Live stats ───────────────────────────────────────────────── */

export function LiveStatsPreview() {
  // The real Readouts strip — colour, opacity, style (off / text /
  // mini / flash), unit, decimal-toggle and progress mode all flow
  // through unchanged.
  return (
    <PreviewPracticeProvider>
      <div className="px-5 py-7 sm:px-7 sm:py-9">
        <div className="md:hidden">
          <MobileReadouts />
        </div>
        <div className="hidden md:block">
          <Readouts />
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}

/* ─── Typing area ──────────────────────────────────────────────── */

export function TypingAreaPreview() {
  // maxLineWidth, linesRendered, tape mode, smoothLineScroll,
  // typedEffect, highlightMode all live in Passage and reflect
  // immediately when toggled.
  return <PreviewSurface height="h-[200px]" />;
}

/* ─── Keyboard ─────────────────────────────────────────────────── */

export function KeyboardLivePreview() {
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

/* ─── Result ───────────────────────────────────────────────────── */

export function ResultLivePreview() {
  // Real <TestSummary preview /> — exactly the same component the
  // user sees after a real run, fed by PreviewPracticeProvider with
  // a seeded completed-run state. Every appearance pref that lives
  // on the result screen (typingSpeedUnit, alwaysShowDecimal,
  // startGraphsAtZero, --ft-passage-* tokens, font + caret) flows
  // through unchanged because the real component is doing the work.
  return (
    <PreviewPracticeProvider phase="done">
      <div className="min-h-[420px]">
        <TestSummary preview />
      </div>
    </PreviewPracticeProvider>
  );
}

/* ─── Multiplayer ──────────────────────────────────────────────── */

/** Multiplayer preview. Mounts the real `<Passage>` inside
 *  `<PreviewPracticeProvider>` and passes the same `wordBackground` /
 *  `wordTextColor` overrides the race screen uses, so the in-passage
 *  marker mode renders 1:1 from the same code path. Static "opponent"
 *  positions are seeded relative to the preview cursor so each marker
 *  mode (Off / Highlight / Text colour) shows a clear visual delta:
 *    - Off       — passage reads exactly like single-player
 *    - Highlight — soft tint band on words behind the slowest opponent
 *    - Text      — upcoming letters paint in the slowest opponent's colour */
const MULTIPLAYER_PREVIEW_WORDS = [
  "ride",
  "the",
  "tide",
  "as",
  "racers",
  "stack",
  "up",
  "behind",
  "you",
  "and",
  "stretch",
  "out",
  "ahead",
];
type MockOpponent = { id: string; color: string; reachedWord: number };
// Slowest first — matches the slowest-first sort in RacePassage so
// the rendered tide reads identically. With the preview cursor at
// word 4, kassia sits one word behind, selan two ahead, damiel five
// ahead — every marker mode has a visible read. Colours kept in
// sync with `playerColorFor` so the preview matches the race.
const MOCK_OPPONENTS: readonly MockOpponent[] = [
  { id: "kassia", color: "oklch(0.68 0.20 305)", reachedWord: 3 },
  { id: "selan", color: "oklch(0.70 0.13 195)", reachedWord: 6 },
  { id: "damiel", color: "oklch(0.65 0.18 250)", reachedWord: 9 },
];
const MOCK_USER_CURSOR = 4;

export function MultiplayerPreview() {
  const { prefs } = useAppearancePrefs();
  const showColors = prefs.multiplayerPlayerColors;
  const marker = prefs.multiplayerOpponentMarker;

  function opponentForWord(wi: number): MockOpponent | null {
    if (!showColors || marker === "off") return null;
    for (const op of MOCK_OPPONENTS) {
      if (op.reachedWord >= wi) return op;
    }
    return null;
  }
  const wordBackground =
    marker === "tint"
      ? (wi: number) => {
          const op = opponentForWord(wi);
          return op
            ? `color-mix(in oklch, ${op.color} 22%, transparent)`
            : undefined;
        }
      : undefined;
  const wordTextColor =
    marker === "text"
      ? (wi: number) => opponentForWord(wi)?.color
      : undefined;

  return (
    <PreviewPracticeProvider
      words={MULTIPLAYER_PREVIEW_WORDS}
      finishedWords={MOCK_USER_CURSOR}
      cursorChar={1}
      errorWord={undefined}
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="relative h-[160px] w-full">
          <Passage
            wordBackground={wordBackground}
            wordTextColor={wordTextColor}
          />
        </div>
        {showColors ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <LegendDot label="@you" color="var(--primary)" />
            {MOCK_OPPONENTS.map((op) => (
              <LegendDot key={op.id} label={`@${op.id}`} color={op.color} />
            ))}
          </div>
        ) : (
          <p className="border-t border-border/60 pt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Player colours are off · turn them on to enable the in-passage marker.
          </p>
        )}
      </div>
    </PreviewPracticeProvider>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  );
}

/* ─── Surface ──────────────────────────────────────────────────── */

/** Sampler that shows what the user's Surface choices do at a glance:
 *  a card, a divider, a button row, and a passage line. The whole
 *  preview reads CSS vars from the cascade so any data-attr-driven
 *  override (card surfaces, dividers, bg fill, monochrome) shows up
 *  here without bespoke logic. */
export function SurfacePreview() {
  return (
    <div className="flex flex-col gap-5 px-5 py-6 sm:px-6">
      <div className="rounded-md border border-border bg-card px-4 py-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Card surface
        </div>
        <div className="text-sm text-foreground">
          Sample row · floats on the page bg when transparent.
        </div>
      </div>
      <div className="ft-divider border-t border-border pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Section divider
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="rounded-md">
          Primary
        </Button>
        <Button size="sm" variant="outline" className="rounded-md">
          Outline
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-accent-foreground">
          <span className="size-1 rounded-full bg-primary" />
          Accent tag
        </span>
      </div>
      <PreviewPracticeProvider>
        <div className="relative h-[64px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
    </div>
  );
}

/* ─── Chrome ───────────────────────────────────────────────────── */

/** Two stacked mocks: the topbar at the top, the footer strip at the
 *  bottom, with a passage band sandwiched in the middle. Each band
 *  paints with the same classes the real chrome uses so a topbar
 *  style switch is visible immediately. The auto-hide knob can't be
 *  meaningfully demo'd here (it reacts to phase === "running" on a
 *  real run); the row blurb explains. */
export function ChromePreview() {
  return (
    <div className="flex flex-col gap-3 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/85 px-4 py-2 backdrop-blur-md">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          flinttype
        </span>
        <nav className="hidden gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:flex">
          <span className="text-foreground">Practice</span>
          <span>Drills</span>
          <span>Races</span>
        </nav>
      </div>
      <PreviewPracticeProvider>
        <div className="relative h-[80px] w-full">
          <Passage />
        </div>
      </PreviewPracticeProvider>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/85 px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>FLINTTYPE © MMXXVI</span>
        <span className="hidden gap-3 sm:flex">
          <span>GitHub</span>
          <span>Settings</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Keymap ───────────────────────────────────────────────────── */

export function KeymapLivePreview() {
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
