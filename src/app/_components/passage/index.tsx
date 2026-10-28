"use client";

import { useRef } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { tapeFadeMask } from "@/lib/tape-fade";
import { cn } from "@/lib/utils";
import { CaretGlyph } from "./caret";
import { UNTYPED_TEXT } from "./colors";
import { AdaptLoadingSkeleton } from "./skeleton";
import { passageScrollMotion } from "./scroll-motion";
import { PassageWords } from "./words";
import { usePractice } from "../practice-state";
import { usePassageCaret } from "./use-caret";
import { LINE_RATIO, usePassageFit } from "./use-fit";
import { usePassageLines } from "./use-lines";

/** Public entry — gates on adaptLoading *before* any of the heavy
 *  layout hooks below. The gate sits in this thin wrapper so the
 *  conditional return doesn't change the number of hooks called by
 *  the Passage component instance: if adaptLoading flips between
 *  renders the body simply mounts / unmounts. (The previous shape
 *  ran usePractice, then early-returned, then ran a dozen more hooks
 *  on the non-loading path — which is the "Rendered more hooks than
 *  during the previous render" violation.) */
export type PassageProps = {
  /** Optional per-word background tint. Race uses this to overlay
   *  opponent-position bands so the user can see where each racer is
   *  in the passage. Returns a CSS colour (e.g. `color-mix(...)`) or
   *  undefined for no tint. Practice and drills don't pass this. */
  wordBackground?: (wordIdx: number) => string | undefined;
  /** Optional per-word text colour override. Race uses this to paint
   *  upcoming words in an opponent's colour so the opponent's leading
   *  edge reads as coloured letters bleeding back toward the user.
   *  Only applied to words *past* the user's cursor — already-typed
   *  words keep their typed colour so the user's own progress feedback
   *  stays intact. */
  wordTextColor?: (wordIdx: number) => string | undefined;
  /** Optional content rendered *inside* the passage's centred column,
   *  directly above the clipped text, so it rides with the text as one
   *  vertically-centred group instead of floating at the top of the
   *  surface. Practice passes the live readouts here. Its height is
   *  reserved from the line-fit calc so the group never overflows. */
  above?: React.ReactNode;
};

export function Passage(props: PassageProps = {}) {
  const { adaptLoading } = usePractice();
  if (adaptLoading) return <AdaptLoadingSkeleton />;
  return (
    <PassageBody
      wordBackground={props.wordBackground}
      wordTextColor={props.wordTextColor}
      above={props.above}
    />
  );
}

function PassageBody({ wordBackground, wordTextColor, above }: PassageProps) {
  const { state } = usePractice();
  const { words, cursorWord, cursorChar, errorWords, phase, typed } = state;
  const { settings: caretSettings } = useCaretSettings();
  const { prefs } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const blind = prefs.blindMode;
  const showCaret = phase !== "done" && caretSettings.style !== "off";

  // maxLineWidth in characters; 0 = stretch to container.
  const maxWidthStyle =
    appearance.maxLineWidth > 0
      ? { maxWidth: `${appearance.maxLineWidth}ch`, marginInline: "auto" }
      : undefined;

  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Wraps the optional `above` slot (the live readouts on practice).
  // Its measured height is subtracted from the line-fit budget so the
  // {readouts + text} group fits the centred column without clipping a
  // line. Collapses to 0 height when the slot is empty / display:none
  // (mobile, where readouts live in the footer instead).
  const aboveRef = useRef<HTMLDivElement | null>(null);
  // The text block: the viewport plus the quote credit under it.
  const groupRef = useRef<HTMLDivElement | null>(null);

  const tapeMode = appearance.tapeMode;
  const tapeOn = tapeMode !== "off";

  // Tape edge fade — a horizontal opacity mask on the (fixed) viewport.
  // The gradient (and the caret-crisp clamp) is built by `tapeFadeMask`;
  // typed history dissolves to the left while the caret + upcoming text
  // stay crisp, and the far-right edge softens. Opacity only — no colour
  // — so the tape stays paper-and-ink.
  const tapeFadeGrad = tapeOn
    ? tapeFadeMask(appearance.tapeFade, appearance.tapeMargin)
    : null;
  const tapeFadeStyle: React.CSSProperties | undefined = tapeFadeGrad
    ? { maskImage: tapeFadeGrad, WebkitMaskImage: tapeFadeGrad }
    : undefined;

  const { fontPx, lineHeight, clipHeight } = usePassageFit({
    outerRef,
    innerRef,
    aboveRef,
    groupRef,
    appearance,
    tapeOn,
  });

  // The viewport hugs text shorter than `clipHeight` (a one-line quote
  // keeps its credit right under it) and, mid-run, grows downward
  // without moving the text (`pull`). See use-lines.ts.
  const lines = usePassageLines({
    outerRef,
    aboveRef,
    groupRef,
    innerRef,
    lineHeight,
    clipHeight,
    tapeOn,
    running: phase === "running",
    words,
    typed,
  });

  const { caret, animate, scrollOffset, scrollX, activeWordRef, registerTarget } =
    usePassageCaret({
      outerRef,
      innerRef,
      words,
      cursorWord,
      cursorChar,
      lineHeight,
      clipHeight,
      tapeOn,
      tapeMode,
      tapeMargin: appearance.tapeMargin,
    });

  // Viewport height — multi-line uses `clipHeight` (a whole-line
  // multiple of the parent height), trimmed to the text's own lines
  // when it is shorter; tape mode collapses to a single line so the
  // surrounding chrome doesn't reserve space the user can't see
  // content in.
  const viewportHeight = tapeOn
    ? lineHeight != null
      ? `${lineHeight}px`
      : "auto"
    : lines.height != null
      ? `${lines.height}px`
      : "100%";
  // Scroll glide timing; the caret matches it in tape mode. See
  // scroll-motion.ts.
  const { animateScroll, scrollDurationMs, scrollEase } = passageScrollMotion({
    smoothLineScroll: appearance.smoothLineScroll,
    running: phase === "running",
    tapeOn,
    tapeMode,
  });
  return (
    <div
      ref={outerRef}
      // Centre the clipped viewport in the available height so the text
      // sits in the middle of the screen rather than pinned to the top
      // with empty space below it. The viewport is a fixed whole-line
      // height; justify-center floats it vertically. Scroll math is
      // unaffected (it translates the inner *within* the viewport).
      className="relative flex h-full w-full flex-col justify-center overflow-hidden"
    >
      {/* Optional content (practice readouts) riding directly above the
       *  clipped text, so the two centre as one group. shrink-0 keeps it
       *  at its natural height; its height is reserved in the line-fit
       *  calc above. Empty/hidden → collapses to 0. */}
      {above ? (
        <div ref={aboveRef} className="w-full shrink-0">
          {above}
        </div>
      ) : null}
      {/* Text block: the viewport and the quote credit, one flex item.
       *  `min-h-0` lets it shrink like the bare viewport used to when
       *  the group overflows. The negative bottom margin (`lines.pull`)
       *  cancels lines a run adds out of the centred layout, so they
       *  grow downward instead of shifting the text. */}
      <div
        ref={groupRef}
        className="flex min-h-0 w-full flex-col"
        style={lines.pull > 0 ? { marginBottom: -lines.pull } : undefined}
      >
      {/* Viewport — fixes the visible region to a whole-line multiple of
       *  the parent height so a partial line never peeks at the bottom.
       *  The translated `inner` block scrolls inside this clip box. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: viewportHeight, ...tapeFadeStyle }}
      >
      <div
        ref={innerRef}
        // Tailwind text-* sizes are pre-multiplied by --ft-font-scale via
        // arbitrary-value calcs so the user's Size preset scopes to the
        // passage only — bumping it here doesn't enlarge the chrome,
        // sidebar, or every other rem-based size in the app.
        className={cn(
          // Size + line-height are computed (fit-to-space) and applied
          // inline below — NOT via viewport-height media queries, which
          // couldn't see the chrome above the passage and clipped a giant
          // line in half on crowded surfaces (the zoom-out bug). The
          // --ft-font-scale Size preset now feeds the ceiling in the
          // measure effect (use-fit.ts) rather than multiplying a fixed
          // base here.
          "relative select-none font-normal tracking-[0.04em]",
          // Default colour for any untyped span without an explicit
          // class — the wrapper itself paints in the untyped role.
          UNTYPED_TEXT,
        )}
        style={{
          // Fit-to-space size: the largest font that shows the target
          // whole-line count in the measured available height (see the
          // measure effect in use-fit.ts). Falls back to a sensible size
          // for the single pre-measure frame (useLayoutEffect fills it in
          // before paint).
          fontSize: `${fontPx ?? 28}px`,
          lineHeight: `${lineHeight ?? (fontPx ?? 28) * LINE_RATIO}px`,
          // Same scoping principle for the family override — it lives on
          // the passage, not body. Defaults inherit body's mono.
          fontFamily: "var(--ft-font-family, inherit)",
          wordSpacing: "var(--ft-word-spacing, 0.25em)",
          // Tape mode collapses to a single nowrap line so words slide
          // horizontally instead of wrapping. Off → normal block flow.
          whiteSpace: tapeOn ? "nowrap" : undefined,
          // translate3d carries both scroll axes. Vertical (multi-line)
          // pins the cursor to mid-line; horizontal (tape) pins it to
          // tapeMargin%. Each axis is 0 when not in use, so they
          // compose without interference.
          transform: `translate3d(${-scrollX}px, ${-scrollOffset}px, 0)`,
          transition: animateScroll
            ? `transform ${scrollDurationMs}ms ${scrollEase}`
            : "none",
          willChange:
            scrollOffset !== 0 || scrollX !== 0 ? "transform" : undefined,
          // maxLineWidth — only applies to wrapped (non-tape) layouts;
          // a tape line has no wrap point so a max width would just be
          // dead space.
          ...(tapeOn ? {} : maxWidthStyle),
        }}
      >
        {showCaret && caret ? (
          <CaretGlyph
            caret={caret}
            settings={caretSettings}
            animate={animate}
            idle={phase === "rest" && appearance.caretIdle === "pulse"}
            // In tape mode the caret is pinned at the anchor and the
            // text slides beneath it. Lock the caret's horizontal
            // transition to the scroll's so the two move together — the
            // visible caret then holds steady at the margin instead of
            // wobbling. `0` (smooth off) snaps both in lockstep too.
            transformDurationMs={
              tapeOn ? (animateScroll ? scrollDurationMs : 0) : undefined
            }
          />
        ) : null}
        <PassageWords
          words={words}
          typed={typed}
          cursorWord={cursorWord}
          cursorChar={cursorChar}
          errorWords={errorWords}
          blind={blind}
          appearance={appearance}
          wordBackground={wordBackground}
          wordTextColor={wordTextColor}
          activeWordRef={activeWordRef}
          registerTarget={registerTarget}
        />
      </div>
      </div>
      {state.mode === "QUOTE" &&
      state.quoteSource &&
      appearance.quoteAttribution !== "hidden" ? (
        appearance.quoteAttribution === "chip" ? (
          <span className="mt-6 inline-flex w-fit items-center rounded-pill border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            {state.quoteSource}
          </span>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            — {state.quoteSource}
          </p>
        )
      ) : null}
      {state.mode === "QUOTE" && words.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Loading quote…
        </p>
      ) : null}
      </div>
    </div>
  );
}
