"use client";

import { useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { Passage } from "../../_components/passage";
import { usePractice } from "../../_components/practice-state";
import { playerColorFor } from "./race-data";
import { RacePlayerStrip } from "./player-strip";
import { useRace } from "./race-state";
import { PhaseRow } from "./phase-row";
import type { Racer } from "./race-types";

/** Race passage. The actual typing surface IS practice's <Passage>
 *  component — same caret, same per-char colouring, same smooth-line
 *  scroll, same appearance prefs. The race layer adds one slim
 *  status row above the passage (the only chrome that swaps per
 *  phase) and the per-racer progress strip below. No more blurred
 *  overlays; the passage is always cleanly visible. */
export function RacePassage() {
  const { state, countdownNumber } = useRace();
  const { state: practice } = usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  const you = state.racers.find((r) => r.isYou)!;
  const totalChars = state.totalChars;
  const correctChars = you.correctChars;
  const wordsDone =
    totalChars > 0 && correctChars >= totalChars
      ? state.words.length
      : Math.min(practice.cursorWord, state.words.length);
  const acc = liveAccuracy(practice.typed, practice.words);
  const wpm = you.wpm;
  const showColors = appearance.multiplayerPlayerColors;
  const marker = appearance.multiplayerOpponentMarker;

  // Pre-compute the leading opponent per word, then render either as
  // a soft background tint or as a text-colour override depending on
  // the user's `multiplayerOpponentMarker` pref. Both modes share the
  // same upstream calculation: for each word, find the slowest
  // opponent who has typed past it. The slowest-first sort yields
  // layered bands — slowest opponent flags the most words, faster
  // opponents extend further past them.
  const opponentByWord = useMemo(() => {
    if (!showColors || marker === "off") return undefined;
    const wordStarts: number[] = [];
    let acc = 0;
    for (const w of state.words) {
      wordStarts.push(acc);
      acc += w.length + 1;
    }
    const opponents = state.racers
      .filter((r): r is Racer => !r.isYou && r.correctChars > 0)
      .sort((a, b) => a.correctChars - b.correctChars);
    return (wi: number): string | undefined => {
      const start = wordStarts[wi];
      if (start == null) return undefined;
      for (const r of opponents) {
        if (r.correctChars > start) return playerColorFor(r.id);
      }
      return undefined;
    };
  }, [showColors, marker, state.racers, state.words]);

  const wordTints = useMemo(() => {
    if (!opponentByWord || marker !== "tint") return undefined;
    return (wi: number): string | undefined => {
      const c = opponentByWord(wi);
      return c ? `color-mix(in oklch, ${c} 22%, transparent)` : undefined;
    };
  }, [opponentByWord, marker]);

  const wordTextColor = useMemo(() => {
    if (!opponentByWord || marker !== "text") return undefined;
    return (wi: number): string | undefined => opponentByWord(wi);
  }, [opponentByWord, marker]);

  const racing =
    state.phase === "racing" || state.phase === "finished";
  // Show opponents from matching onward — by the time bots are
  // entering the lobby the user wants to see who they'll race. Only
  // hidden during the empty queue phase where there's nothing to look
  // at except your own row.
  const showLineup =
    state.phase === "matching" ||
    state.phase === "lobby" ||
    state.phase === "countdown" ||
    racing;
  return (
    <>
      <PhaseRow
        phase={state.phase}
        countdownNumber={countdownNumber}
        joinedOpponents={
          state.racers.filter((r) => !r.isYou && r.joinedAt != null).length
        }
        totalOpponents={state.racers.filter((r) => !r.isYou).length}
        racingReadout={
          racing
            ? {
                left: `${wordsDone}/${state.words.length} WORDS`,
                metrics: [
                  { label: "WPM", value: String(wpm), accent: true },
                  { label: "ACC", value: `${acc.toFixed(1)}%` },
                ],
              }
            : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="min-h-0 flex-1">
          {racing ? (
            <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
          ) : (
            <HiddenPassage />
          )}
        </div>

        {showLineup ? (
          <RacePlayerStrip
            racers={state.racers}
            totalChars={state.totalChars}
          />
        ) : null}
      </div>
    </>
  );
}

/** Block-bar placeholder for the typing area during pre-race phases.
 *  The passage text mustn't leak before the race starts — racers
 *  who could read ahead would have an unfair edge — so we render
 *  three muted bars at the same line geometry as the real `<Passage>`
 *  (same font-scale × line-height math) and swap to the live passage
 *  the instant the countdown hits GO. Layout doesn't shift on the
 *  swap because the bars share the passage's typography rules. */
function HiddenPassage() {
  const widths = ["100%", "94%", "78%"];
  return (
    <div aria-hidden className="flex h-full w-full items-start">
      <div className="flex w-full flex-col gap-3 text-[calc(var(--ft-font-scale,1)*1.75rem)] leading-[2.1] sm:text-[calc(var(--ft-font-scale,1)*2.125rem)] sm:leading-[2.2] lg:text-[calc(var(--ft-font-scale,1)*2.5rem)] lg:leading-[2.3]">
        {widths.map((w, i) => (
          <span
            key={i}
            className="block h-[1em] rounded-sm bg-foreground/[0.06]"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

function liveAccuracy(
  typed: readonly string[],
  words: readonly string[],
): number {
  let correct = 0;
  let total = 0;
  for (let wi = 0; wi < typed.length; wi++) {
    const t = typed[wi] ?? "";
    const w = words[wi] ?? "";
    const len = Math.max(t.length, w.length);
    for (let ci = 0; ci < len; ci++) {
      if (ci < t.length && ci < w.length && t[ci] === w[ci]) correct++;
      else if (ci < t.length) total++; // wrong or extra
      if (ci < t.length) total++;
    }
  }
  if (total === 0) return 100;
  return Math.round((correct / total) * 1000) / 10;
}
