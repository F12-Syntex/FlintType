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
import { SpectatorPassage } from "./spectator-passage";

/** Race passage. The actual typing surface IS practice's <Passage>
 *  component — same caret, same per-char colouring, same smooth-line
 *  scroll, same appearance prefs. The race layer adds the lineup card
 *  (one lane per racer) above the passage, and before the gun the
 *  private-lobby controls / countdown in the passage's slot. No blurred
 *  overlays; the passage is always cleanly visible. */
export function RacePassage() {
  const { state, countdownNumber, onlineSnapshot } = useRace();
  const { state: practice } = usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  // Author attribution for QUOTE races. The server stamps this on
  // every snapshot once the room is created so the line lands even
  // before the passage is revealed (the pre-race note shows it).
  const quoteSource = onlineSnapshot?.quoteSource;
  // `you` is null for a pure spectator (joined a full/started lobby and
  // never got a seat). Every `you`-derived value below is guarded so the
  // surface renders the live race for them instead of crashing.
  const you = state.racers.find((r) => r.isYou) ?? null;
  const isSpectator = !you;
  const totalChars = state.totalChars;
  const correctChars = you?.correctChars ?? 0;
  const wordsDone =
    totalChars > 0 && correctChars >= totalChars
      ? state.words.length
      : Math.min(practice.cursorWord, state.words.length);
  // Keystroke-based accuracy from the practice reducer's counters —
  // same semantics as the solo readout (corrected + stop-on-error-
  // blocked mistakes both count; backspace neutral).
  const acc =
    isSpectator || practice.totalChars === 0
      ? 100
      : Math.round((practice.correctChars / practice.totalChars) * 1000) / 10;
  const wpm = you?.wpm ?? 0;
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
  // Spectator window: you've finished, but the room hasn't — swap
  // your passage for a live view of another racer's cursor.
  // RaceResults renders below in the page tree (page.tsx) so your
  // stats are visible at the same time.
  const youFinished = you?.finishedAt != null;
  // Swap in the live spectator passage when: you finished but the room
  // hasn't (watch another racer), OR you're a pure spectator (no seat)
  // for the whole race. (Once the race is over the body shows the
  // results card + a passage recap instead of this surface.)
  const showSpectator = isSpectator
    ? state.phase === "racing"
    : state.phase === "racing" && youFinished;
  // You finished while others race: the body scrolls and stacks your
  // provisional results right under this surface, so lay out at natural
  // height (no fill-and-clip) and the results start above the fold.
  const natural = !isSpectator && youFinished;
  // Player roster shows from matching through the live race (incl. the
  // post-finish spectator view while the room runs on). At "finished"
  // it's dropped: the RaceResults standings table is THE roster then,
  // so the passage text below can have the full surface to itself.
  const showLineup =
    state.phase === "matching" ||
    state.phase === "lobby" ||
    state.phase === "countdown" ||
    state.phase === "racing";
  const totalOpponents = state.racers.filter((r) => !r.isYou).length;
  const joinedOpponents = state.racers.filter(
    (r) => !r.isYou && r.joinedAt != null,
  ).length;
  // The live racetrack (each racer a bead gliding toward the finish).
  // Shown from matching onward; the TypeRacer "cars on top" element.
  const lineupEl = showLineup ? (
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
      showStats={!isSpectator}
      showReady={onlineSnapshot?.kind === "challenge"}
    />
  ) : null;

  // While racing, the roster sits at the TOP (compact + height-capped),
  // and the passage fills ALL the remaining space below it, centring its
  // text within that space. (We used to mirror the roster at the bottom
  // to centre on the viewport, but that doubled the roster's footprint
  // and crushed the passage to nothing once a lobby had several racers.)
  if (racing) {
    return (
      <div
        className={cn(
          "flex flex-col",
          !natural && "min-h-0 flex-1 overflow-hidden",
        )}
      >
        {/* Roster at the top, fully visible. mb gives the passage /
         *  spectator content below it real breathing room so the text
         *  never crowds the player-list card. */}
        {lineupEl ? (
          <div className="mb-4 shrink-0 sm:mb-6">{lineupEl}</div>
        ) : null}
        {/* overflow-hidden is load-bearing in the fill layout: when the
         *  roster + a short viewport squeeze this slot, the spectator
         *  header/passage must clip at the slot boundary instead of
         *  painting under the roster card (the FT spectate-overlap bug).
         *  The quote's author rides with the spectator text (inside it);
         *  while you type, the pre-race note already named the author. */}
        <div className={cn(!natural && "min-h-0 flex-1 overflow-hidden")}>
          {showSpectator ? (
            <SpectatorPassage
              words={state.words}
              racers={state.racers}
              source={quoteSource}
            />
          ) : (
            <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
          )}
        </div>
      </div>
    );
  }

  // Pre-race (matching / lobby / countdown): the racetrack card, then
  // the private-lobby controls (challenge rooms only). The lineup header
  // already says where we are ("Finding racers", "Lobby"), so there's no
  // poster repeating it; one quiet line explains the wait instead. The
  // countdown takes the slot the passage is about to occupy.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden sm:gap-6">
      {lineupEl}
      <ChallengeLobby />
      {state.phase === "countdown" ? (
        <div className="min-h-0 flex-1">
          <CountdownPanel n={countdownNumber ?? 3} />
        </div>
      ) : (
        <PreRaceNote
          phase={state.phase}
          isChallenge={onlineSnapshot?.kind === "challenge"}
          quoteSource={quoteSource}
        />
      )}
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

/** One quiet line under the lineup while the race is being set up: what
 *  the wait is, plus the quote's author when the race is a quote. The
 *  private lobby's own controls already explain themselves, so its
 *  note is just the author (or nothing). */
function PreRaceNote({
  phase,
  isChallenge,
  quoteSource,
}: {
  phase: RacePhase;
  isChallenge: boolean;
  quoteSource?: string;
}) {
  const status = isChallenge
    ? null
    : phase === "matching"
      ? "Looking for racers. The race starts in a few seconds."
      : phase === "lobby"
        ? "Everyone's in. Get ready."
        : null;
  if (!status && !quoteSource) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 text-center">
      {status ? (
        <p role="status" className="text-sm text-muted-foreground">
          {status}
        </p>
      ) : null}
      {quoteSource ? (
        <p className="text-sm italic text-muted-foreground">
          A quote from {quoteSource}
        </p>
      ) : null}
    </div>
  );
}
