"use client";

import { cn } from "@/lib/utils";
import { usePractice } from "../../_components/practice-state";
import { recapWords } from "./passage-recap-words";
import { QuoteAttribution } from "./quote-attribution";
import { useRace } from "./race-state";

/** The passage, shown under the results card once the race is over.
 *
 *  A quiet, fully wrapped recap rather than the live typing surface:
 *  the live passage paints typed text in the brand colour and clips to
 *  a line window, which turned the whole recap into a block of orange
 *  competing with the results card's one orange number (and showed only
 *  a fragment on phones). Here every word is ink, a word you left wrong
 *  is the destructive colour with an underline, and the quote's author
 *  sits right under the text. A watcher (no seat, nothing typed) sees
 *  the passage in plain ink. */
export function PassageRecap() {
  const { state, onlineSnapshot } = useRace();
  const { state: practice } = usePractice();
  const you = state.racers.find((r) => r.isYou) ?? null;
  if (state.words.length === 0) return null;
  // A timed race shows only the stretch that was reached (see
  // recapWords); a watcher's is the furthest racer's.
  const { shown: words, wrong } = recapWords(
    state.words,
    you ? { typed: practice.typed, cursorWord: practice.cursorWord } : null,
    {
      timed: onlineSnapshot?.durationSec != null,
      furthestChars: Math.max(0, ...state.racers.map((r) => r.correctChars)),
    },
  );
  const missed = wrong.filter(Boolean).length;
  const source = onlineSnapshot?.quoteSource;

  return (
    <section aria-labelledby="race-passage-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="race-passage-title" className="text-sm font-semibold text-foreground">
          Passage
        </h3>
        {missed > 0 ? (
          <span className="text-xs text-muted-foreground">
            {missed === 1 ? "1 word" : `${missed} words`} left wrong, underlined
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-base leading-relaxed text-foreground/80 sm:text-lg">
          {words.map((w, i) => (
            <span key={i}>
              <span
                className={cn(
                  wrong[i] &&
                    "text-destructive underline decoration-destructive/60 decoration-2 underline-offset-4",
                )}
              >
                {w}
              </span>
              {i < words.length - 1 ? " " : null}
            </span>
          ))}
        </p>
        {source ? <QuoteAttribution source={source} /> : null}
      </div>
    </section>
  );
}
