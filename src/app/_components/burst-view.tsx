"use client";

import type { ReactNode } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { useBurstView } from "./burst-practice";
import { usePractice } from "./practice-state";
import { Readout, ReadoutRow } from "./readout";

/** What BURST renders in place of the passage and its readouts: the
 *  live stats row and the single centred word. Pure renderers; the
 *  burst rules live in BurstProvider (burst-practice.tsx). */

/** Per-letter colour tokens, mirrored from Passage. Both surfaces
 *  read the same CSS variables so the user's colour customisation
 *  applies to BURST identically. */
const TYPED_TEXT = "text-[var(--ft-passage-typed,var(--primary))]";
const UNTYPED_TEXT =
  "text-[var(--ft-passage-untyped,var(--muted-foreground))]";
const ERROR_TEXT = "text-[var(--ft-passage-error,var(--destructive))]";

/* ─── Readouts (replaces <Readouts /> in BURST) ─────────────── */

/** Desktop readouts row for BURST: the same <Readout> row as the
 *  WORDS readouts, centred directly above the single centred word so
 *  the two read as one group. The last speed is the headline; it turns
 *  primary on a clean, fast-enough commit. */
export function BurstReadouts() {
  const { state } = usePractice();
  const { reps, repsRequired, threshold, thresholdAuto, lastWpm, outcome } =
    useBurstView();
  const itemsLength = state.words.length;
  const itemIdx = Math.min(state.cursorWord + 1, itemsLength);

  return (
    <ReadoutRow className="hidden justify-center md:flex">
      {/* LAST is always rendered (an em dash until the first commit) so
       *  the row never reflows mid-run and shifts the centred word. */}
      <Readout
        hero
        accent={outcome === "win"}
        label="last wpm"
        value={lastWpm != null ? String(lastWpm) : "—"}
      />
      <Readout label="reps" value={`${reps} of ${repsRequired}`} />
      {/* The speed a rep has to reach to count. When it's set
       *  automatically from your speed, a hover note says so rather
       *  than a jargon suffix on the label. */}
      <Readout
        label="goal"
        value={`${threshold}`}
        title={
          thresholdAuto ? "Set automatically from your recent speed" : undefined
        }
      />
      <Readout label="items" value={`${itemIdx} of ${itemsLength}`} />
    </ReadoutRow>
  );
}

/** Mobile readouts for BURST — drops in where <MobileReadouts /> would
 *  otherwise render, one line. */
export function BurstMobileReadouts() {
  const { state } = usePractice();
  const { reps, repsRequired, threshold, lastWpm, outcome } = useBurstView();
  const itemsLength = state.words.length;
  const itemIdx = Math.min(state.cursorWord + 1, itemsLength);
  return (
    <div className="flex min-w-0 flex-nowrap items-baseline gap-x-3 overflow-hidden">
      <Readout
        compact
        accent={outcome === "win"}
        label="last"
        value={lastWpm != null ? String(lastWpm) : "—"}
      />
      <Readout compact label={`of ${repsRequired} reps`} value={String(reps)} />
      <Readout compact label="goal" value={String(threshold)} />
      <Readout compact label={`of ${itemsLength} items`} value={String(itemIdx)} />
    </div>
  );
}

/* ─── Word view (replaces <Passage /> in BURST) ─────────────── */

/** The centred, large single word the user is currently typing.
 *  Pure renderer — all the BURST behaviour lives in BurstProvider.
 *  Paints each character through the same tokens Passage uses
 *  (TYPED_TEXT / UNTYPED_TEXT / ERROR_TEXT) plus the mistakeStyle
 *  pref so customisation flows through 1:1 with WORDS. */
export function BurstWordView({ above }: { above?: ReactNode } = {}) {
  const { state } = usePractice();
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const { settings: caret } = useCaretSettings();
  const { outcome } = useBurstView();
  const cursorWord = state.cursorWord;
  const typedHere = state.typed[cursorWord] ?? "";
  const target = state.words[cursorWord] ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 sm:gap-12">
      {/* Optional slot directly above the word (the desktop readouts),
       *  so stats and word centre together like the passage's `above`. */}
      {above}
      <BurstWord
        word={target}
        typed={typedHere}
        blind={behaviour.blindMode}
        mistakeStyle={appearance.mistakeStyle}
        showCaret={caret.style !== "off" && state.phase !== "done"}
        caretStyle={caret.style}
      />
      {/* Hint line — always rendered, with a non-breaking space
       *  fallback ( ) when there's nothing to say so the
       *  paragraph reserves real line height. Without this the
       *  column re-centers mid-attempt when the hint goes empty
       *  and the word visibly jumps. */}
      <p className="min-h-[1.5em] text-sm text-muted-foreground">
        {outcome === "wrong"
          ? "Not quite, try again"
          : outcome === "slow"
            ? "Too slow, go again"
            : typedHere === target && target.length > 0
              ? "Press space to commit"
              : typedHere.length === 0
                ? "Type the word, then space"
                : "\u00a0"}
      </p>
    </div>
  );
}

function BurstWord({
  word,
  typed,
  blind,
  mistakeStyle,
  showCaret,
  caretStyle,
}: {
  word: string;
  typed: string;
  blind: boolean;
  mistakeStyle: "color" | "bold" | "underline" | "highlight";
  showCaret: boolean;
  caretStyle: "line" | "block" | "underline" | "outline" | "off";
}) {
  const targetChars = [...word];
  const typedChars = [...typed];
  const len = Math.max(targetChars.length, typedChars.length);
  const cursorChar = Math.min(typedChars.length, targetChars.length);
  return (
    <div
      className="tracking-tight"
      style={{
        fontFamily: "var(--ft-font-family, inherit)",
        fontSize: "clamp(2.5rem, 7vw, 5rem)",
      }}
    >
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

          const isError =
            !blind && (isExtra || (got !== undefined && got !== expected));
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
          }

          const isCursor = showCaret && ci === cursorChar && !isExtra;
          return (
            <span key={ci} className="relative inline-block">
              <span className={cn(cls, errorCls)} style={errorStyle}>
                {glyph}
              </span>
              {isCursor ? <InlineCaret style={caretStyle} /> : null}
            </span>
          );
        })}
        {showCaret && cursorChar === targetChars.length && typed === word ? (
          <span className="relative inline-block">
            <InlineCaret style={caretStyle} trailing />
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** The configured caret (line / block / underline / outline) drawn
 *  inside a relative glyph span. Shared with the result replay so both
 *  show the same caret as the passage. */
export function InlineCaret({
  style,
  trailing,
}: {
  style: "line" | "block" | "underline" | "outline" | "off";
  trailing?: boolean;
}) {
  const base = "pointer-events-none absolute ft-caret-blink";
  if (style === "line") {
    return (
      <span
        aria-hidden
        className={cn(base, "top-0 bottom-[0.1em] w-[0.08em]")}
        style={{
          left: trailing ? "100%" : "-0.04em",
          backgroundColor: "var(--primary)",
          borderRadius: "2px",
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        aria-hidden
        className={cn(base, "inset-0")}
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--primary) 35%, transparent)",
          borderRadius: "2px",
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        className={cn(base, "right-0 bottom-0 left-0 h-[0.08em]")}
        style={{ backgroundColor: "var(--primary)" }}
      />
    );
  }
  if (style === "outline") {
    return (
      <span
        aria-hidden
        className={cn(base, "inset-0 border")}
        style={{
          borderColor: "var(--primary)",
          borderRadius: "2px",
        }}
      />
    );
  }
  return null;
}
