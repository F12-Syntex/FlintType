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
