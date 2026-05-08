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
          <span key={ci} ref={ref} className={cn(cls, letterCls)}>
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

export function Passage() {
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
  const targetSideRef = useRef<"left" | "right">("left");
  const firstMeasureRef = useRef(true);
  const [caret, setCaret] = useState<CaretPos | null>(null);
  const [animate, setAnimate] = useState(false);
  // Clip the passage to a whole number of lines so a partial last line
  // never peeks through the bottom edge.
  const [clipHeight, setClipHeight] = useState<number | null>(null);

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
    const target = targetRef.current;
    if (!inner || !target) {
      setCaret(null);
      firstMeasureRef.current = true;
      setAnimate(false);
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    setCaret({
      charLeft: r.left - innerRect.left,
      charRight: r.right - innerRect.left,
      top: r.top - innerRect.top,
      height: r.height,
      width: r.width,
      side: targetSideRef.current,
    });
    if (firstMeasureRef.current) {
      firstMeasureRef.current = false;
      // Re-enable the transition on the next frame so the very first
      // placement doesn't animate from (0, 0).
      requestAnimationFrame(() => setAnimate(true));
    }
  }, [cursorWord, cursorChar, words]);

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      <div
        ref={innerRef}
        // Tailwind text-* sizes are pre-multiplied by --ft-font-scale via
        // arbitrary-value calcs so the user's Size preset scopes to the
        // passage only — bumping it here doesn't enlarge the chrome,
        // sidebar, or every other rem-based size in the app.
        className={cn(
          "relative select-none font-normal tracking-[0.04em] text-[calc(var(--ft-font-scale,1)*1.5rem)] leading-[2.2] sm:text-[calc(var(--ft-font-scale,1)*1.875rem)] sm:leading-[2.3] lg:text-[calc(var(--ft-font-scale,1)*2.25rem)] lg:leading-[2.4]",
          // Default colour for any untyped span without an explicit
          // class — the wrapper itself paints in the untyped role.
          UNTYPED_TEXT,
        )}
        style={{
          // Same scoping principle for the family override — it lives on
          // the passage, not body. Defaults inherit body's mono.
          fontFamily: "var(--ft-font-family, inherit)",
          wordSpacing: "var(--ft-word-spacing, 0.25em)",
          ...(clipHeight != null
            ? { maxHeight: `${clipHeight}px`, overflow: "hidden" }
            : {}),
          ...maxWidthStyle,
        }}
      >
        {showCaret && caret ? (
          <CaretGlyph
            caret={caret}
            settings={caretSettings}
            animate={animate}
          />
        ) : null}
        {words.map((word, wi) => {
          if (wi < cursorWord) {
            const isErr = errorWords.has(wi);
            const typedWord = typed[wi] ?? "";
            return (
              <span
                key={wi}
                className={cn(
                  blind ? UNTYPED_TEXT : TYPED_TEXT,
                  !blind &&
                    isErr &&
                    cn(
                      "underline decoration-1 underline-offset-[6px]",
                      ERROR_DECORATION,
                    ),
                  // typedEffect: fade dims past words; strike crosses them.
                  !blind && typedEffect === "fade" && "opacity-40",
                  !blind && typedEffect === "strike" && "line-through decoration-1 opacity-70",
                )}
              >
                {!blind && isErr ? (
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
                />{" "}
              </span>
            );
          }
          // Next-word emphasis: lift the immediately following word.
          const isNextWord =
            (highlightNextWord || highlightNextLetter) &&
            wi === cursorWord + 1;
          return (
            <span
              key={wi}
              className={cn(
                UNTYPED_TEXT,
                isNextWord &&
                  cn(
                    "rounded-sm bg-foreground/10 px-1 opacity-80",
                    TYPED_TEXT,
                  ),
              )}
            >
              {word}{" "}
            </span>
          );
        })}
      </div>
      {state.mode === "QUOTE" && state.quoteSource ? (
        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          — {state.quoteSource}
        </p>
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
      className={cn(
        "pointer-events-none absolute top-0 left-0",
        // Class-based blink so per-keystroke re-renders don't restart
        // the animation (would never reach the hidden half otherwise).
        blinkSpeed > 0 && "ft-caret-blink",
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
