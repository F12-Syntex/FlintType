"use client";

import { useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { Passage } from "../../_components/passage";
import { usePractice } from "../../_components/practice-state";
import { cn } from "@/lib/utils";
import { ChallengeLobby } from "./challenge-lobby";
import { playerColorFor, RACE_MODES } from "./race-data";
import { RaceLineupPanel } from "./lineup-panel";
import { useRace } from "./race-state";
import type { Racer, RacePhase } from "./race-types";

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
  // Player roster shows from matching onwards. Hidden in queue
  // (empty room — only the user) and in finished if everyone's
  // already wrapped (RaceResults takes over visually).
  const showLineup =
    state.phase === "matching" ||
    state.phase === "lobby" ||
    state.phase === "countdown" ||
    racing;
  const totalOpponents = state.racers.filter((r) => !r.isYou).length;
  const joinedOpponents = state.racers.filter(
    (r) => !r.isYou && r.joinedAt != null,
  ).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {showLineup ? (
        <RaceLineupPanel
          racers={state.racers}
          totalChars={state.totalChars}
          phase={state.phase as RacePhase}
          modeName={RACE_MODES[state.modeId].name}
          joinedOpponents={joinedOpponents}
          totalOpponents={totalOpponents}
          wordsDone={wordsDone}
          totalWords={state.words.length}
          wpm={wpm}
          accuracy={acc}
        />
      ) : null}

      <div className="min-h-0 flex-1">
        {racing ? (
          <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
        ) : state.phase === "countdown" ? (
          <CountdownPanel n={countdownNumber ?? 3} />
        ) : (
          <RacePoster
            modeName={RACE_MODES[state.modeId].name}
            detail={RACE_MODES[state.modeId].detail}
            phase={state.phase}
          />
        )}
      </div>

      <ChallengeLobby />
    </div>
  );
}

/** Full-bleed countdown takeover for the typing area. Sits in the
 *  same slot the passage will occupy — big enough to read across the
 *  room, no panel chrome, no blur. The number itself does the work:
 *  primary coral, tabular-nums so the digit swap doesn't reshuffle
 *  the baseline, ease-out scale animation each second to add motion
 *  without being a distraction. GO fires last and gets the same
 *  treatment (only difference is the glyph). */
function CountdownPanel({ n }: { n: number }) {
  const label = n === 0 ? "GO" : String(n);
  return (
    <div
      aria-live="polite"
      aria-label={`Starting in ${label}`}
      className="flex h-full w-full items-center justify-center"
    >
      <span
        key={label}
        className={cn(
          "font-extrabold tracking-tight tabular-nums text-primary",
          "text-[28vmin] leading-none",
          "motion-safe:animate-[ft-countdown-pop_320ms_cubic-bezier(0.16,1,0.3,1)]",
        )}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {label}
      </span>
    </div>
  );
}

/** Editorial mode poster shown in the typing area during queue /
 *  matching / lobby. Replaces the earlier skeleton-bar placeholder
 *  which read as "still loading…" — this poster reads as intentional
 *  content: the race you're about to run, sitting calmly until you
 *  start. Big mode name, one line of detail beneath, sized to fill
 *  the typing slot without competing with the chrome above. */
function RacePoster({
  modeName,
  detail,
  phase,
}: {
  modeName: string;
  detail: string;
  phase: string;
}) {
  // The headline never changes between queue/matching/lobby — same
  // race, same poster. The subtitle nudges contextually so the user
  // gets a beat of fresh feedback at each step without redundant
  // copy versus the PhaseRow up top.
  const subtitle =
    phase === "queue"
      ? "ready when you are"
      : phase === "matching"
        ? "racers are joining"
        : phase === "lobby"
          ? "everyone is in"
          : detail;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
      <span
        className={cn(
          "font-extrabold tracking-tight tabular-nums text-foreground",
          "text-[14vmin] leading-none sm:text-[12vmin] lg:text-[10vmin]",
        )}
      >
        {modeName}
      </span>
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {subtitle}
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {detail}
      </span>
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

