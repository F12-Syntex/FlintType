"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
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
};

export function Passage(props: PassageProps = {}) {
  const { adaptLoading } = usePractice();
  if (adaptLoading) return <AdaptLoadingSkeleton />;
  return (
    <PassageBody
      wordBackground={props.wordBackground}
      wordTextColor={props.wordTextColor}
    />
  );
}

function PassageBody({
  wordBackground,
  wordTextColor,
}: {
  wordBackground?: (wordIdx: number) => string | undefined;
  wordTextColor?: (wordIdx: number) => string | undefined;
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

  const registerTarget = (el: HTMLSpanElement | null, side: "left" | "right") => {
    targetRef.current = el;
    targetSideRef.current = side;
  };

  // Measure available height vs computed line-height and clamp the
  // passage to a whole-line multiple. ResizeObserver covers viewport
  // changes; the appearance dependency below covers font-scale /
  // family swaps that change line-height without resizing the box.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(inner).lineHeight);
      const h = outer.clientHeight;
      if (!Number.isFinite(lh) || lh <= 0 || h <= 0) return;
      setLineHeight(lh);
      const fits = Math.max(1, Math.floor(h / lh));
      // 0 = unbounded; otherwise cap to whichever is smaller so a tall
      // viewport can't sneak past the user's chosen line count.
      const cap = appearance.linesRendered > 0
        ? Math.min(fits, appearance.linesRendered)
        : fits;
      setClipHeight(cap * lh);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [appearance]);

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
      // Don't pull the line right of its natural start — at the very
      // first word the user expects the line to *start* at the anchor,
      // not have empty space pushed in front of it. Math.max prevents
      // negative scrollX on the first few words when the cursor's
      // position is left of the anchor.
      setScrollX(Math.max(0, cursorX - anchor));
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
  // In word-tape mode, jumps between words happen rarely (one per
  // ~5 keystrokes) so an animation reads as a clear "next word"
  // signal; in letter-tape mode, every keypress nudges the line
  // and animating each one would smear the text. So we honour
  // smoothLineScroll for vertical scroll and tape-word, but force
  // jumps in tape-letter regardless.
  const animateScroll =
    appearance.smoothLineScroll && tapeMode !== "letter";
  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      {/* Viewport — fixes the visible region to a whole-line multiple of
       *  the parent height so a partial line never peeks at the bottom.
       *  The translated `inner` block scrolls inside this clip box. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: viewportHeight }}
      >
      <div
        ref={innerRef}
        // Tailwind text-* sizes are pre-multiplied by --ft-font-scale via
        // arbitrary-value calcs so the user's Size preset scopes to the
        // passage only — bumping it here doesn't enlarge the chrome,
        // sidebar, or every other rem-based size in the app.
        className={cn(
          // Default passage size is generous on purpose — typing
          // tests are easier to read and easier on the eyes when
          // the text is bigger than ordinary copy. Mobile / sm: /
          // lg: bumps step up roughly proportionally; the
          // --ft-font-scale multiplier still applies so users can
          // shrink (or further enlarge) from the customise page.
          //
          // The lg: bump (2.5rem) is gated on viewport HEIGHT too
          // (`[@media(min-height:900px)]`) — at lg: width but a
          // short viewport (1080p with 150% Windows display
          // scaling lands at ~720 CSS px tall), the bigger text
          // collides with the keyboard and the passage collapses
          // to one line. Keeping the sm: bump (2.125rem) at lg:
          // width on short viewports preserves the multi-line
          // read.
          "relative select-none font-normal tracking-[0.04em] text-[calc(var(--ft-font-scale,1)*1.75rem)] leading-[2.1] sm:text-[calc(var(--ft-font-scale,1)*2.125rem)] sm:leading-[2.2] [@media(min-height:900px)]:lg:text-[calc(var(--ft-font-scale,1)*2.5rem)] [@media(min-height:900px)]:lg:leading-[2.3]",
          // Default colour for any untyped span without an explicit
          // class — the wrapper itself paints in the untyped role.
          UNTYPED_TEXT,
        )}
        style={{
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
            ? "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)"
            : "none",
          willChange:
            scrollOffset > 0 || scrollX > 0 ? "transform" : undefined,
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
        transition:
          animate && smoothSpeed > 0
            ? `transform ${smoothSpeed}ms cubic-bezier(0.16, 1, 0.3, 1), width ${smoothSpeed}ms cubic-bezier(0.16, 1, 0.3, 1), height ${smoothSpeed}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : "none",
        ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
        willChange: "transform",
      }}
    />
  );
}
