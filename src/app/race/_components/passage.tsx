"use client";

import { useMemo } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { Passage } from "../../_components/passage";
import { playerColorFor } from "./race-data";
import { RacePlayerStrip } from "./player-strip";
import { useRace } from "./race-state";
import type { Racer } from "./race-types";
import { cn } from "@/lib/utils";

/** Race passage. The actual typing surface IS practice's <Passage>
 *  component — same caret, same per-char colouring, same smooth-line
 *  scroll, same appearance prefs. The simplified layout drops the
 *  per-passage WPM/ACC/words strip (the HUD above the surface carries
 *  WPM + elapsed already, and the live accuracy was duplicating
 *  signals you can already feel from the per-char colouring). The
 *  opponent positions strip below the passage is the multi-racer
 *  leaderboard now that the side-rail lanes are gone. */
export function RacePassage() {
  const { state, countdownNumber } = useRace();
  const { prefs: appearance } = useAppearancePrefs();
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
  const showStrip =
    state.phase === "racing" ||
    state.phase === "finished" ||
    state.phase === "countdown";
  return (
    <div className="relative flex min-h-[18rem] flex-1 flex-col rounded-md border border-border bg-card px-7 py-8 sm:px-9">
      <div className="min-h-0 flex-1">
        <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
      </div>

      {showStrip ? (
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

