"use client";

import { Passage } from "@/app/_components/passage";
import { MobileReadouts, Readouts } from "@/app/_components/readouts";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { PREVIEW_WORDS, PreviewPracticeProvider } from "../preview-practice";

/** Section previews built on the *real* practice passage, mounted in a
 *  read-only practice context (`<PreviewPracticeProvider>`). Every
 *  override the user makes propagates 1:1 because these are the same
 *  components the test runs — no parallel rendering, no mocked
 *  visuals. */

/* ─── Shared height-bounded surface ─────────────────────────────── */

/** Wrap the real <Passage /> in a height-bounded card so it sits
 *  inside the preview pane. The passage is fit-to-space: it sizes the
 *  text to show the user's line target within the box, capped at the
 *  chosen Size (px). In a short preview box the text is fit-limited, so
 *  surfaces that demonstrate Size (Typography) pass a taller `height`
 *  to give the px ceiling room to read. */
function PreviewSurface({
  height = "h-[132px]",
  withReadouts = false,
}: {
  height?: string;
  withReadouts?: boolean;
}) {
  return (
    <PreviewPracticeProvider>
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6">
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

/* ─── Caret & cursor ───────────────────────────────────────────── */

export function CaretPreview() {
  // Real Passage with phase=running shows the live caret — every
  // setting (style, thickness, roundness, blink, smooth) flows
  // through to the real CaretGlyph the test uses.
  return <PreviewSurface />;
}

/* ─── Typography ───────────────────────────────────────────────── */

export function TypographyPreview() {
  // Taller box than the default preview: the passage is fit-to-space, so
  // a short box would clamp the text to the lines-fit size and the Size
  // (px) control would look inert. The extra height lets the chosen px
  // ceiling govern across most of its range, so the slider visibly moves.
  return <PreviewSurface height="h-[320px]" />;
}

/* ─── Background ───────────────────────────────────────────────── */

export function BackgroundPreview() {
  const { prefs, effectiveImage } = useBackgroundPrefs();
  const hasImage = effectiveImage.length > 0;

  // Frame the real passage inside a background-painted shell so the
  // user sees the image (or fallback) actually behind their typing
  // surface — same composition as /app.
  return (
    <div className="px-4 py-5 sm:px-5 sm:py-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-foreground/15"
        style={
          hasImage
            ? {
                backgroundImage: `url("${effectiveImage}")`,
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

/* ─── Typing area ──────────────────────────────────────────────── */

export function TypingAreaPreview() {
  // maxLineWidth, linesRendered, tape mode, smoothLineScroll,
  // typedEffect, highlightMode and the mistake style all live in
  // Passage and reflect immediately. The active word ("jumps") carries
  // one wrong letter and one extra so the Mistakes row has a target:
  //   target:  j u m p s
  //   typed:   j u y p s x
  return (
    <PreviewPracticeProvider
      words={PREVIEW_WORDS}
      finishedWords={4}
      activeWordTyped="juypsx"
      errorWord={1}
    >
      <div className="px-4 py-5 sm:px-5 sm:py-6">
        <div className="relative h-[160px] w-full">
          <Passage />
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}
