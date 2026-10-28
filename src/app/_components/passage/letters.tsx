import { cn } from "@/lib/utils";
import {
  ERROR_DECORATION,
  ERROR_TEXT,
  TYPED_TEXT,
  UNTYPED_TEXT,
} from "./colors";

/** The word under the cursor, one span per letter. Registers the caret's
 *  target letter (and which edge the line caret hugs) via
 *  `registerTarget`. */
export function ActiveWord({
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
export function PastErrorWord({ target, typed }: { target: string; typed: string }) {
  const t = [...target];
  const u = [...typed];
  const len = Math.max(t.length, u.length);
  // The underline lives on this inline-block itself: a text-decoration
  // set on the outer word span doesn't reach into an inline-block, so it
  // used to underline only the trailing space (a stray "_" after the word).
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap underline decoration-1 underline-offset-[6px]",
        ERROR_DECORATION,
      )}
    >
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
