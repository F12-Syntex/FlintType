import type { RefObject } from "react";
import type { AppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { TYPED_TEXT, UNTYPED_TEXT } from "./colors";
import { ActiveWord, PastErrorWord } from "./letters";
import type { State } from "../practice-reducer";

/** The passage's words: typed words behind the cursor, the active word
 *  (letter by letter, see ActiveWord) and the words still to come. */
export function PassageWords({
  words,
  typed,
  cursorWord,
  cursorChar,
  errorWords,
  blind,
  appearance,
  wordBackground,
  wordTextColor,
  activeWordRef,
  registerTarget,
}: Pick<State, "words" | "typed" | "cursorWord" | "cursorChar" | "errorWords"> & {
  blind: boolean;
  appearance: AppearancePrefs;
  wordBackground?: (wordIdx: number) => string | undefined;
  wordTextColor?: (wordIdx: number) => string | undefined;
  /** Attached to the active word (tape "word" mode anchors on it). */
  activeWordRef: RefObject<HTMLSpanElement | null>;
  registerTarget: (el: HTMLSpanElement | null, side: "left" | "right") => void;
}) {
  // Appearance: highlightMode controls how the *current* word and the
  // *next* token are visually emphasised. typedEffect fades or strikes
  // through already-typed words. Both have an "off" no-op.
  const hl = appearance.highlightMode;
  const typedEffect = appearance.typedEffect;
  const markIncompleteWord = appearance.markIncompleteWord;
  const highlightCurrentWord = hl === "word";
  const highlightNextWord = hl === "next-word";
  const highlightNextLetter = hl === "next-letter";
  return (
    <>
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
    </>
  );
}
