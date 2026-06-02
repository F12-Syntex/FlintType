"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { tapeFadeMask } from "@/lib/tape-fade";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

/** Practice-text colour roles — kept as separate tokens from the
 *  global palette because the passage is the only place where
 *  typed/untyped/error letters need to follow their own scale (MT's
 *  main/sub/error split, for instance). The MonkeyType import maps
 *  `mainColor` / `subColor` / `errorColor` to these tokens directly so
 *  they never bleed into chrome body text. Defaults track the active
 *  theme: typed paints in `--primary` (the brand spark, also what MT
 *  renders correctly-typed letters in), untyped in `--muted-foreground`,
 *  and errors in `--destructive`. */
const TYPED_TEXT = "text-[var(--ft-passage-typed,var(--primary))]";
const UNTYPED_TEXT =
  "text-[var(--ft-passage-untyped,var(--muted-foreground))]";
const ERROR_TEXT = "text-[var(--ft-passage-error,var(--destructive))]";
const ERROR_DECORATION =
  "decoration-[var(--ft-passage-error,var(--destructive))]";

type CaretPos = {
  /** Left edge of the target char (inside the inner block). */
  charLeft: number;
  /** Right edge of the target char (inside the inner block). */
  charRight: number;
  /** Top of the target char (inside the inner block). */
  top: number;
  /** Char height. */
  height: number;
  /** Char width. */
  width: number;
  /** Which side of the char the line-style caret should hug. */
  side: "left" | "right";
};

function ActiveWord({
  word,
  typed,
  cursorChar,
  registerTarget,
  blind,
  letterHighlight,
  mistakeStyle,
}: {
  word: string;
  typed: string;
  cursorChar: number;
  registerTarget: (el: HTMLSpanElement | null, side: "left" | "right") => void;
  blind: boolean;
  /** Per-letter highlight mode:
   *   - "letter": underline the cursor position (current letter)
   *   - "next-letter": ring the next letter the user will type */
  letterHighlight: "off" | "letter" | "next-letter";
  /** Active-word mistake cue stacked on top of the error colour. See
   *  `MistakeStyle` in appearance-prefs. */
  mistakeStyle: "color" | "bold" | "underline" | "highlight";
}) {
  const targetChars = [...word];
  const typedChars = [...typed];
  const len = Math.max(targetChars.length, typedChars.length);
  return (
    <span className="inline-block whitespace-nowrap">
      {Array.from({ length: len }, (_, ci) => {
        const expected = targetChars[ci];
        const got = typedChars[ci];
        const isExtra = ci >= targetChars.length;
        const glyph = got ?? expected ?? "";

        let cls: string;
        if (blind) cls = UNTYPED_TEXT;
        else if (isExtra) cls = ERROR_TEXT;
        else if (got === undefined) cls = UNTYPED_TEXT;
        else if (got === expected) cls = TYPED_TEXT;
        else cls = ERROR_TEXT;

        // Per-letter emphasis. "letter" mode is the *default* behaviour
        // — the caret itself marks the active letter, no extra static
        // marker needed (a caret + underline at the same position
        // reads as a visual bug). "next-letter" rings the cell so the
        // user sees the upcoming target.
        const isCursorLetter = ci === cursorChar;
        const letterCls =
          !blind && isCursorLetter && letterHighlight === "next-letter"
            ? "rounded-sm bg-primary/15 text-primary px-0.5"
            : "";

        // Active-word mistake feedback — user-configurable via the
        // Mistakes appearance section (`mistakeStyle`). Every variant
        // paints the error hue; the extra cue stacks per setting:
        //   color     — colour only (quietest)
        //   bold      — colour + bold weight (default; mono is
        //               width-stable so caret measurement unaffected)
        //   underline — colour + 2px underline
        //   highlight — colour + soft fill behind the glyph (loudest)
        // The fill tracks --ft-passage-error so user-customised passage
        // error colour still flows through. Past errored words have
        // their own underline gated by `markIncompleteWord`.
        const isError =
          !blind &&
          (isExtra || (got !== undefined && got !== expected));
        let errorCls = "";
        let errorStyle: React.CSSProperties | undefined;
        if (isError) {
          if (mistakeStyle === "bold") {
            errorCls = "font-bold";
          } else if (mistakeStyle === "underline") {
            errorCls =
              "underline decoration-2 underline-offset-[6px] decoration-[var(--ft-passage-error,var(--destructive))]";
          } else if (mistakeStyle === "highlight") {
            errorCls = "rounded-sm font-bold";
            errorStyle = {
              backgroundColor:
                "color-mix(in oklch, var(--ft-passage-error, var(--destructive)) 20%, transparent)",
            };
          }
          // "color" — colour only, no extra cue. ERROR_TEXT class
          // already supplies the hue further down via `cls`.
        }

        // Caret target:
        //   cursorChar < len  → left edge of char at cursorChar
        //   cursorChar >= len → right edge of last char (caret past the
        //                        end, e.g. waiting for space on a perfect
        //                        match, or sitting after the last extra).
        const isBeforeTarget = ci === cursorChar && cursorChar < len;
        const isAfterLastTarget =
          cursorChar >= len && ci === len - 1;
        const ref =
          isBeforeTarget
            ? (el: HTMLSpanElement | null) => registerTarget(el, "left")
            : isAfterLastTarget
              ? (el: HTMLSpanElement | null) => registerTarget(el, "right")
              : null;

        return (
          <span
            key={ci}
            ref={ref}
            className={cn(cls, letterCls, errorCls)}
            style={errorStyle}
          >
            {glyph}
          </span>
        );
      })}
    </span>
  );
}

/** Renders a past word that the user got wrong — shows what they
 *  actually typed (so the misspelling is visible) with per-char
 *  colouring: matched chars stay foreground, mismatched chars go
 *  primary, untyped target chars trail in muted, extras stay primary. */
function PastErrorWord({ target, typed }: { target: string; typed: string }) {
  const t = [...target];
  const u = [...typed];
  const len = Math.max(t.length, u.length);
  return (
    <span className="inline-block whitespace-nowrap">
      {Array.from({ length: len }, (_, ci) => {
        const exp = t[ci];
        const got = u[ci];
        const isExtra = ci >= t.length;
        const missing = got === undefined && !isExtra;
        const wrong = got !== undefined && got !== exp;
        const glyph = got ?? exp ?? "";
        const cls = missing
          ? UNTYPED_TEXT
          : wrong || isExtra
            ? ERROR_TEXT
            : TYPED_TEXT;
        return (
          <span key={ci} className={cls}>
            {glyph}
          </span>
        );
      })}
    </span>
  );
}

/** Skeleton shown while an adaptive batch is loading. Three pulsing
 *  bars matching the passage line geometry (font scale, line-height
 *  rules) so the swap to real text is a content drop-in, not a layout
 *  shift. Marked `motion-safe:` so reduced-motion users get a static
 *  block instead of a pulse. */
function AdaptLoadingSkeleton() {
  // Three lines mirrors the default `linesRendered` cap. Widths drop a
  // little per line so the block reads as paragraph shape, not a
  // uniform grid. `bg-foreground/8` is dim enough on light theme to
  // sit calmly under any palette without competing with the caret.
  const widths = ["100%", "94%", "78%"];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading adaptive passage"
      className="relative flex h-full w-full items-start"
    >
      <div
        className="flex w-full flex-col gap-3 text-[calc(var(--ft-font-scale,1)*1.75rem)] leading-[2.1] sm:text-[calc(var(--ft-font-scale,1)*2.125rem)] sm:leading-[2.2] lg:text-[calc(var(--ft-font-scale,1)*2.5rem)] lg:leading-[2.3]"
        aria-hidden
      >
        {widths.map((w, i) => (
          <span
            key={i}
            className="block h-[1em] rounded-sm bg-foreground/[0.08] motion-safe:animate-pulse"
            style={{ width: w, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading adaptive passage…</span>
    </div>
  );
}

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

function PassageBody({
  wordBackground,
  wordTextColor,
  above,
}: {
  wordBackground?: (wordIdx: number) => string | undefined;
  wordTextColor?: (wordIdx: number) => string | undefined;
  above?: React.ReactNode;
}) {
  const { state } = usePractice();
  const { words, cursorWord, cursorChar, errorWords, phase, typed } = state;
  const { settings: caretSettings } = useCaretSettings();
  const { prefs } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const blind = prefs.blindMode;
  const showCaret = phase !== "done" && caretSettings.style !== "off";

  // Appearance: highlightMode controls how the *current* word and the
  // *next* token are visually emphasised. typedEffect fades or strikes
  // through already-typed words. Both have an "off" no-op.
  const hl = appearance.highlightMode;
  const typedEffect = appearance.typedEffect;
  const markIncompleteWord = appearance.markIncompleteWord;
  const highlightCurrentWord = hl === "word";
  const highlightNextWord = hl === "next-word";
  const highlightNextLetter = hl === "next-letter";
  // maxLineWidth in characters; 0 = stretch to container.
  const maxWidthStyle =
    appearance.maxLineWidth > 0
      ? { maxWidth: `${appearance.maxLineWidth}ch`, marginInline: "auto" }
      : undefined;

  // Single, absolutely-positioned caret. Its transform animates between
  // character positions so the | slides forward instead of teleporting.
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Wraps the optional `above` slot (the live readouts on practice).
  // Its measured height is subtracted from the line-fit budget so the
  // {readouts + text} group fits the centred column without clipping a
  // line. Collapses to 0 height when the slot is empty / display:none
  // (mobile, where readouts live in the footer instead).
  const aboveRef = useRef<HTMLDivElement | null>(null);
  // High-water mark of the above-slot height within a measurement cycle.
  // The readouts can shrink mid-run (the "flash" live-stat style hides
  // stats most of the time), and we don't want the text to reflow every
  // time they fade out — so we reserve the tallest height seen and only
  // reset it when appearance changes (which re-runs the effect).
  const aboveMaxRef = useRef(0);
  const targetRef = useRef<HTMLSpanElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const targetSideRef = useRef<"left" | "right">("left");
  const firstMeasureRef = useRef(true);
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const [animate, setAnimate] = useState(false);
  // Clip the passage to a whole number of lines so a partial last line
  // never peeks through the bottom edge.
  const [clipHeight, setClipHeight] = useState<number | null>(null);
  // One computed line-height in px. Used as the viewport height in tape
  // mode (single-line layout) and as the unit for vertical scroll math.
  const [lineHeight, setLineHeight] = useState<number | null>(null);
  // Fit-to-space font size in px. The passage no longer takes a fixed
  // size off viewport-height media queries (which couldn't see how much
  // chrome sat above it, so a crowded surface clipped a giant line in
  // half and the user had to zoom the browser out). Instead we MEASURE
  // the real available height and pick the largest font that shows the
  // target whole-line count — shrinking when space is tight, capping at
  // the comfortable max when there's room. See the measure effect below.
  const [fontPx, setFontPx] = useState<number | null>(null);
  // Translate-up offset on the inner block. Stays at 0 until the cursor
  // crosses line `floor(cap/2)`, then grows by one line-height per line
  // completed past that point — so once you've reached the midline of
  // the visible window, every line you complete reveals a fresh line at
  // the bottom (and the line you just left scrolls off the top). Cursor
  // settles at the midline and stays there for the rest of the run.
  const [scrollOffset, setScrollOffset] = useState(0);
  // Horizontal translate when tape mode is on. Pinned so the cursor
  // (letter mode) or active word (word mode) sits at `tapeMargin%` of
  // the viewport width.
  const [scrollX, setScrollX] = useState(0);

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

  const registerTarget = (el: HTMLSpanElement | null, side: "left" | "right") => {
    targetRef.current = el;
    targetSideRef.current = side;
  };

  // Fit-to-space sizing. Measure the passage's REAL available height and
  // pick the font size + whole-line count that fit it — never a size
  // taken off the viewport's height (which can't see the chrome stacked
  // above the passage, the root cause of the "zoom the browser out to
  // read the text" bug: a crowded surface left < 1 line of room, the old
  // code forced one giant line anyway, and overflow-hidden + centring
  // sliced it through the middle).
  //
  // Algorithm, given available height H (minus the reserved `above`
  // slot) and the target whole-line count T:
  //   1. font = H / (T · LINE_RATIO)        — largest size fitting T lines
  //   2. clamp to [MIN, MAX·scale]          — Size preset raises the ceiling
  //   3. font = min(font, H / LINE_RATIO)   — but ALWAYS keep ≥1 whole line
  //   4. show min(T, ⌊H / lineHeight⌋) whole lines, clipped exactly
  // Step 3 is the guarantee: at least one complete line always fits H, so
  // a line is never sliced in half regardless of how little room is left.
  // ResizeObserver covers container/viewport changes; a MutationObserver
  // on <html> catches Size / palette CSS-var changes that restyle the
  // passage without resizing its box.
  const LINE_RATIO = 2.1;
  const MIN_FONT_PX = 15; // absolute readable floor
  const MAX_FONT_PX = 40; // comfortable ceiling at scale 1 (≈ 2.5rem)
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      // Reserve the above-slot's height (readouts + its gap) so the
      // centred group is `above + N lines`, not `N lines` overflowing
      // it. 0 when the slot is absent or hidden. High-water so a flash
      // hide doesn't reflow the text (see aboveMaxRef).
      const aboveNow = aboveRef.current?.offsetHeight ?? 0;
      aboveMaxRef.current = Math.max(aboveMaxRef.current, aboveNow);
      const h = outer.clientHeight - aboveMaxRef.current;
      if (!Number.isFinite(h) || h <= 0) return;

      // The Size preset (`--ft-font-scale`) raises/lowers the ceiling
      // rather than acting as a fixed multiplier, so a big preset stays
      // big when there's room but still yields to the fit guarantee when
      // space is tight. Read the cascaded value so it works on the real
      // surface (<html>) and inside scoped previews alike.
      const scaleRaw = getComputedStyle(inner)
        .getPropertyValue("--ft-font-scale")
        .trim();
      const scale = Number.parseFloat(scaleRaw) || 1;

      // Tape mode is a single line, so it sizes to fit ONE line in H;
      // multi-line sizes to fit the user's line target (default below).
      const target = tapeOn
        ? 1
        : appearance.linesRendered > 0
          ? appearance.linesRendered
          : 3;

      let font = h / (target * LINE_RATIO);
      font = Math.min(font, MAX_FONT_PX * scale);
      font = Math.max(font, MIN_FONT_PX);
      // Always keep at least one whole line within H (beats the floor in
      // pathologically short space) so a line is never sliced.
      font = Math.min(font, h / LINE_RATIO);

      const lh = font * LINE_RATIO;
      const fits = Math.max(1, Math.floor(h / lh));
      const shown = appearance.linesRendered > 0
        ? Math.min(appearance.linesRendered, fits)
        : fits;

      setFontPx(font);
      setLineHeight(lh);
      setClipHeight(shown * lh);
    };
    // Reset the high-water reservation per appearance change so a smaller
    // readouts size / a removed slot reclaims the space.
    aboveMaxRef.current = 0;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    if (aboveRef.current) ro.observe(aboveRef.current);
    // Size / palette changes flip CSS vars on <html> without resizing the
    // box; observe its attribute mutations so the fit recomputes live.
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [appearance, tapeOn]);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const outer = outerRef.current;
    const target = targetRef.current;
    if (!inner || !outer || !target) {
      setCaret(null);
      setScrollOffset(0);
      setScrollX(0);
      firstMeasureRef.current = true;
      setAnimate(false);
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    // r.top - innerRect.top stays a stable local coordinate even when
    // inner is translated — the transform shifts both rects equally.
    const targetTopInInner = r.top - innerRect.top;
    const targetLeftInInner = r.left - innerRect.left;
    setCaret({
      charLeft: targetLeftInInner,
      charRight: r.right - innerRect.left,
      top: targetTopInInner,
      height: r.height,
      width: r.width,
      side: targetSideRef.current,
    });

    if (tapeOn) {
      // Tape mode — single horizontal line. The cursor stays pinned at
      // `tapeMargin%` of the viewport width; words slide left as the
      // user advances. "letter" tracks the caret's exact x position
      // (per keystroke); "word" tracks the active word's left edge
      // (per word boundary), so the cursor moves freely *within* a
      // word and only the line repositions when a new word starts.
      const viewportWidth = outer.clientWidth;
      const anchor =
        viewportWidth * Math.max(0, Math.min(100, appearance.tapeMargin)) / 100;
      let cursorX = targetLeftInInner;
      if (tapeMode === "word") {
        const ws = activeWordRef.current;
        if (ws) {
          const wsRect = ws.getBoundingClientRect();
          cursorX = wsRect.left - innerRect.left;
        }
      }
      // Pin the cursor (letter) / active word (word) at the anchor from
      // the very first keystroke — real tape behaviour. A *negative*
      // scrollX is intentional and correct: it translates the line to
      // the right so the first character sits at the margin with empty
      // space to its left (exactly how Monkeytype's tape opens). The
      // old `Math.max(0, …)` clamp pinned the line flush-left until the
      // cursor had typed past the anchor, so the test didn't scroll at
      // the start — that was the bug.
      setScrollX(cursorX - anchor);
      setScrollOffset(0);
    } else {
      // Multi-line — keep the cursor at the mid-line of the viewport
      // once it's typed past it. cap = round(clipHeight/lh), trigger =
      // floor(cap/2), scroll = max(0, currentLine - trigger) * lh.
      setScrollX(0);
      const lh = lineHeight ?? parseFloat(getComputedStyle(inner).lineHeight);
      if (Number.isFinite(lh) && lh > 0 && clipHeight != null && clipHeight > 0) {
        const cap = Math.max(1, Math.round(clipHeight / lh));
        const trigger = Math.max(0, Math.floor(cap / 2));
        const currentLine = Math.max(0, Math.floor(targetTopInInner / lh));
        const desired = Math.max(0, currentLine - trigger) * lh;
        setScrollOffset(desired);
      } else {
        setScrollOffset(0);
      }
    }

    if (firstMeasureRef.current) {
      firstMeasureRef.current = false;
      // Re-enable the transition on the next frame so the very first
      // placement doesn't animate from (0, 0).
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [
    cursorWord,
    cursorChar,
    words,
    clipHeight,
    lineHeight,
    tapeOn,
    tapeMode,
    appearance.tapeMargin,
  ]);

  // Viewport height — multi-line uses `clipHeight` (a whole-line
  // multiple of the parent height); tape mode collapses to a single
  // line so the surrounding chrome doesn't reserve space the user
  // can't see content in.
  const viewportHeight = tapeOn
    ? lineHeight != null
      ? `${lineHeight}px`
      : "auto"
    : clipHeight != null
      ? `${clipHeight}px`
      : "100%";
  // Smooth scroll is honoured in every mode when the user has it on,
  // but ONLY while a run is in progress. At rest the line snaps to its
  // resting position with no transition — so a fresh passage (first
  // paint, or after a restart) spawns already centred at the tape anchor
  // instead of sliding in from wherever the previous run had scrolled
  // to. (Restart keeps the active-word target mounted, so the usual
  // first-measure reset doesn't fire; gating on phase is what makes the
  // spawn instant.)
  // The transition *duration* adapts to the cadence of the moves:
  //   - multi-line / word-tape reposition once every several keystrokes,
  //     so a 220ms glide reads as a clear "next line / next word" slide.
  //   - letter-tape nudges the line on every keypress, so it uses a
  //     short 110ms glide that keeps up with fast typing and tracks the
  //     cursor smoothly instead of smearing (a long glide there would
  //     visibly lag behind the caret).
  // The caret glyph's own transform transition is matched to this
  // duration in tape mode (see CaretGlyph `transformDurationMs`) so the
  // pinned caret and the sliding text move in lockstep — otherwise the
  // caret wobbles around the anchor while the two animations race.
  const animateScroll = appearance.smoothLineScroll && phase === "running";
  // Tape scroll glides at a CONSTANT velocity (linear) so consecutive
  // per-keystroke nudges blend into one continuous slide — an ease-out
  // curve front-loads each nudge and re-accelerates from rest every
  // keystroke, which reads as fast + juttery rather than smooth. The
  // multi-line vertical scroll keeps the ease-out "next line" slide
  // (a discrete jump every few keystrokes, where a decelerating glide
  // reads well). Tape durations are a touch longer so the motion is a
  // visible smooth glide, not an instant snap; the caret matches it
  // (transformDurationMs below) so the two stay in lockstep.
  const scrollDurationMs = !tapeOn ? 220 : tapeMode === "letter" ? 190 : 240;
  const scrollEase = tapeOn ? "linear" : "cubic-bezier(0.16, 1, 0.3, 1)";
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
          // measure effect rather than multiplying a fixed base here.
          "relative select-none font-normal tracking-[0.04em]",
          // Default colour for any untyped span without an explicit
          // class — the wrapper itself paints in the untyped role.
          UNTYPED_TEXT,
        )}
        style={{
          // Fit-to-space size: the largest font that shows the target
          // whole-line count in the measured available height (see the
          // measure effect). Falls back to a sensible size for the single
          // pre-measure frame (useLayoutEffect fills it in before paint).
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
        {words.map((word, wi) => {
          // Race-only background tint marking which opponent has
          // passed this word. Practice / drills leave wordBackground
          // undefined so this is always a no-op outside /race.
          const tint = wordBackground?.(wi);
          const tintStyle = tint
            ? {
                backgroundColor: tint,
                borderRadius: 3,
                boxShadow: `0 0 0 2px ${tint}`,
              }
            : undefined;
          if (wi < cursorWord) {
            const isErr = errorWords.has(wi);
            // Appearance: markIncompleteWord gates the visible error
            // treatment on past-error words. When off, the word
            // renders the same as a clean past word — no underline,
            // no per-char colour split. The state still tracks the
            // word as errored for accuracy / summary.
            const showErr = !blind && isErr && markIncompleteWord;
            const typedWord = typed[wi] ?? "";
            return (
              <span
                key={wi}
                style={tintStyle}
                className={cn(
                  blind ? UNTYPED_TEXT : TYPED_TEXT,
                  showErr &&
                    cn(
                      "underline decoration-1 underline-offset-[6px]",
                      ERROR_DECORATION,
                    ),
                  // typedEffect: fade dims past words; strike crosses them.
                  !blind && typedEffect === "fade" && "opacity-40",
                  !blind && typedEffect === "strike" && "line-through decoration-1 opacity-70",
                )}
              >
                {showErr ? (
                  <PastErrorWord target={word} typed={typedWord} />
                ) : (
                  word
                )}
                {" "}
              </span>
            );
          }
          if (wi === cursorWord) {
            return (
              <span
                key={wi}
                ref={activeWordRef}
                style={tintStyle}
                className={cn(
                  highlightCurrentWord &&
                    cn(
                      "rounded-sm bg-primary/15 px-1 ring-1 ring-primary/30",
                      TYPED_TEXT,
                    ),
                )}
              >
                <ActiveWord
                  word={word}
                  typed={typed[wi] ?? ""}
                  cursorChar={cursorChar}
                  registerTarget={registerTarget}
                  blind={blind}
                  letterHighlight={
                    hl === "letter"
                      ? "letter"
                      : hl === "next-letter"
                        ? "next-letter"
                        : "off"
                  }
                  mistakeStyle={appearance.mistakeStyle}
                />{" "}
              </span>
            );
          }
          // Next-word emphasis: lift the immediately following word.
          const isNextWord =
            (highlightNextWord || highlightNextLetter) &&
            wi === cursorWord + 1;
          // Race-only text-colour override on upcoming words.
          // `wordTextColor(wi)` returns an opponent's colour when
          // that opponent has typed past this word — the letters
          // then paint in their colour so the opponent's leading
          // edge reads as a coloured tide bleeding back toward you.
          // Skipped on already-typed words so the user's own
          // typed-colour feedback stays intact.
          const opponentColor = wordTextColor?.(wi);
          const colorStyle = opponentColor ? { color: opponentColor } : undefined;
          return (
            <span
              key={wi}
              style={{ ...tintStyle, ...colorStyle }}
              className={cn(
                opponentColor ? "" : UNTYPED_TEXT,
                isNextWord &&
                  cn(
                    "rounded-sm bg-foreground/10 px-1 opacity-80",
                    !opponentColor && TYPED_TEXT,
                  ),
              )}
            >
              {word}{" "}
            </span>
          );
        })}
      </div>
      </div>
      {state.mode === "QUOTE" &&
      state.quoteSource &&
      appearance.quoteAttribution !== "hidden" ? (
        appearance.quoteAttribution === "chip" ? (
          <span className="mt-6 inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {state.quoteSource}
          </span>
        ) : (
          <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            — {state.quoteSource}
          </p>
        )
      ) : null}
      {state.mode === "QUOTE" && words.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          loading quote…
        </p>
      ) : null}
    </div>
  );
}

/** Renders the caret glyph at the right place for the chosen style. The
 *  five styles split into two groups:
 *    - "line": a slim bar hugging the next-char edge (or right edge of the
 *      last char when sitting at end-of-word). Width = user thickness.
 *    - "block" / "underline" / "outline": always overlay the target char,
 *      so they ignore which side the line-style caret would hug. */
function CaretGlyph({
  caret,
  settings,
  animate,
  idle,
  transformDurationMs,
}: {
  caret: CaretPos;
  settings: {
    style: "line" | "block" | "underline" | "outline" | "off";
    width: number;
    radius: number;
    blinkSpeed: number;
    smoothSpeed: number;
  };
  animate: boolean;
  /** When true (phase==="rest" + appearance.caretIdle==="pulse"), the
   *  caret softly pulses ~1Hz so the user sees where typing will
   *  start on a bare bg. CSS keyframe lives in globals.css §15. */
  idle: boolean;
  /** Tape mode override for the *transform* (position) transition,
   *  in ms. When set, it replaces the caret's own smoothSpeed for the
   *  horizontal glide so the pinned caret tracks the sliding text in
   *  lockstep (`0` = snap). Width/height keep smoothSpeed. Undefined
   *  outside tape mode → the caret animates on its own smoothSpeed. */
  transformDurationMs?: number;
}) {
  const { style, width, radius, blinkSpeed, smoothSpeed } = settings;

  // Position + dimensions per style.
  const lineX = caret.side === "left" ? caret.charLeft : caret.charRight;
  const blockX = caret.charLeft;

  let x = lineX;
  let y = caret.top;
  let w = width;
  let h = caret.height * 0.85;
  let bg = "var(--primary)";
  let border = "transparent";
  const r = `${radius}px`;

  if (style === "line") {
    y = caret.top + caret.height * 0.075;
  } else if (style === "block") {
    x = blockX;
    w = caret.width;
    h = caret.height;
    bg = "color-mix(in oklch, var(--primary) 35%, transparent)";
  } else if (style === "underline") {
    x = blockX;
    w = caret.width;
    h = width;
    y = caret.top + caret.height - width;
  } else if (style === "outline") {
    x = blockX;
    w = caret.width;
    h = caret.height;
    bg = "transparent";
    border = "var(--primary)";
  }

  return (
    <span
      aria-hidden
      data-ft-caret-idle={idle ? "pulse" : undefined}
      className={cn(
        "pointer-events-none absolute top-0 left-0",
        // Class-based blink so per-keystroke re-renders don't restart
        // the animation (would never reach the hidden half otherwise).
        blinkSpeed > 0 && !idle && "ft-caret-blink",
      )}
      style={{
        width: w,
        height: h,
        backgroundColor: bg,
        border:
          style === "outline" ? `${width}px solid ${border}` : undefined,
        borderRadius: r,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: (() => {
          const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
          // Position glide: tape mode locks it to the scroll duration;
          // elsewhere it's the caret's own smoothSpeed (gated on animate).
          const tMs =
            transformDurationMs ?? (animate && smoothSpeed > 0 ? smoothSpeed : 0);
          // In tape mode (transformDurationMs set) the caret rides with
          // the line, which now glides linearly — match it so the pinned
          // caret tracks the constant-velocity scroll instead of wobbling.
          const transformEase = transformDurationMs != null ? "linear" : ease;
          const parts: string[] = [];
          if (tMs > 0) parts.push(`transform ${tMs}ms ${transformEase}`);
          // Width/height (block/underline caret resizing per char) keep
          // the caret's own smoothSpeed regardless of tape mode.
          if (animate && smoothSpeed > 0) {
            parts.push(`width ${smoothSpeed}ms ${ease}`, `height ${smoothSpeed}ms ${ease}`);
          }
          return parts.length > 0 ? parts.join(", ") : "none";
        })(),
        ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
        willChange: "transform",
      }}
    />
  );
}
