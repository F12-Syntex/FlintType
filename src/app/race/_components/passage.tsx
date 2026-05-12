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
  const showStrip = appearance.multiplayerOpponentStrip;
  const showColors = appearance.multiplayerPlayerColors;

  // Per-word tint: for each word in the passage, find the slowest
  // opponent who has typed past that word's first character. Apply
  // that opponent's colour as a low-opacity background tint so the
  // user sees layered bands marking each opponent's leading edge.
  // The user themselves is omitted — their cursor is the practice
  // caret, not a tint.
  const wordTints = useMemo(() => {
    if (!showColors) return undefined;
    const wordStarts: number[] = [];
    let acc = 0;
    for (const w of state.words) {
      wordStarts.push(acc);
      acc += w.length + 1;
    }
    // Sort opponents slowest-first so the first match in the loop is
    // the slowest racer who has covered each word — yielding bands
    // that step outward as faster racers extend past slower ones.
    const opponents = state.racers
      .filter((r): r is Racer => !r.isYou && r.correctChars > 0)
      .sort((a, b) => a.correctChars - b.correctChars);
    return (wi: number): string | undefined => {
      const start = wordStarts[wi];
      if (start == null) return undefined;
      for (const r of opponents) {
        if (r.correctChars > start) {
          return `color-mix(in oklch, ${playerColorFor(r.id)} 22%, transparent)`;
        }
      }
      return undefined;
    };
  }, [showColors, state.racers, state.words]);
  return (
    <div className="relative flex min-h-[18rem] flex-1 flex-col rounded-md border border-border bg-card px-7 py-8 sm:px-9">
      <div className="mb-5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          YOUR TRACK · {wordsDone}/{state.words.length} WORDS
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-primary">WPM {wpm}</span>
          <span>ACC {acc.toFixed(1)}%</span>
          <span>
            {state.phase === "lobby"
              ? "READY"
              : state.phase === "countdown"
                ? "STARTING"
                : state.phase === "finished"
                  ? "FINISHED"
                  : "RACING"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Passage wordBackground={wordTints} />
      </div>

      {showStrip &&
      (state.phase === "racing" || state.phase === "finished") ? (
        <div className="mt-5 border-t border-border/70 pt-4">
          <RacePlayerStrip
            racers={state.racers}
            totalChars={state.totalChars}
          />
        </div>
      ) : null}

      {state.phase === "countdown" && countdownNumber != null ? (
        <CountdownOverlay n={countdownNumber} />
      ) : null}

      {state.phase === "queue" ? <QueueOverlay /> : null}
      {state.phase === "matching" ? <MatchingOverlay /> : null}
      {state.phase === "lobby" ? <LobbyOverlay /> : null}
    </div>
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
