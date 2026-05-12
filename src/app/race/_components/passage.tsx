"use client";

import { useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { Passage } from "../../_components/passage";
import { usePractice } from "../../_components/practice-state";
import { playerColorFor } from "./race-data";
import { RacePlayerStrip } from "./player-strip";
import { useRace } from "./race-state";
import type { Racer } from "./race-types";
import { cn } from "@/lib/utils";

/** Race passage. The actual typing surface IS practice's <Passage>
 *  component — same caret, same per-char colouring, same smooth-line
 *  scroll, same appearance prefs. The race layer adds the editorial
 *  strip above (mode + words done + your live wpm/acc) and the
 *  countdown overlay during the 3..2..1 phase. */
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
  // Mirrors practice's `<Readouts>` strip — slim row above the passage
  // with the live mode-aware metrics. Practice's row hides on mobile
  // via `hidden md:block`; we match that so the small viewport leads
  // with the passage. Phase word kept short ("LIVE" / "READY" / …) so
  // it doesn't fight the action button up in RaceControls.
  const phaseWord =
    state.phase === "lobby"
      ? "READY"
      : state.phase === "countdown"
        ? "STARTING"
        : state.phase === "finished"
          ? "FINISHED"
          : "LIVE";
  const showStrip =
    state.phase === "racing" ||
    state.phase === "finished" ||
    state.phase === "countdown";
  return (
    <>
      <div className="hidden flex-wrap items-baseline justify-between gap-x-8 gap-y-1 md:flex">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {wordsDone}/{state.words.length} WORDS
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-primary tabular-nums">WPM {wpm}</span>
          <span className="tabular-nums">ACC {acc.toFixed(1)}%</span>
          <span>{phaseWord}</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="min-h-0 flex-1">
          <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
        </div>

        {showStrip ? (
          <RacePlayerStrip
            racers={state.racers}
            totalChars={state.totalChars}
          />
        ) : null}

        {state.phase === "countdown" && countdownNumber != null ? (
          <CountdownOverlay n={countdownNumber} />
        ) : null}
        {state.phase === "queue" ? <QueueOverlay /> : null}
        {state.phase === "matching" ? <MatchingOverlay /> : null}
        {state.phase === "lobby" ? <LobbyOverlay /> : null}
      </div>
    </>
  );
}

function QueueOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Press Find race to queue up
      </span>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Bots only enter the lobby once you queue — you race when you're ready.
      </span>
    </div>
  );
}

function MatchingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Finding racers
        </span>
      </div>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Pairing you with opponents at your level. Hold tight.
      </span>
    </div>
  );
}

function CountdownOverlay({ n }: { n: number }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md",
        "bg-card/90 backdrop-blur-sm",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Starting in
      </span>
      <span className="font-mono text-7xl font-extrabold tabular-nums text-primary sm:text-8xl">
        {n === 0 ? "GO" : n}
      </span>
    </div>
  );
}

function LobbyOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-md bg-card/85 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
          Lobby full · countdown starting
        </span>
      </div>
      <span className="mt-2 max-w-md px-6 text-center text-[12.5px] text-muted-foreground/85">
        Bots wait for the countdown — they don't start moving until GO fires.
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
