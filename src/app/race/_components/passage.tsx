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
 *  scroll, same appearance prefs. The race layer adds one slim
 *  status row above the passage (the only chrome that swaps per
 *  phase) and the per-racer progress strip below. No more blurred
 *  overlays; the passage is always cleanly visible. */
export function RacePassage() {
  const { state, countdownNumber, onlineSnapshot } = useRace();
  const { state: practice } = usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  // Author attribution for QUOTE races. The server stamps this on
  // every snapshot once the room is created so the line lands even
  // before the passage is revealed (so the lobby can already render
  // it under the "QUOTE" poster).
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
  // for the whole race + results.
  const showSpectator = isSpectator
    ? state.phase === "racing" || state.phase === "finished"
    : state.phase === "racing" && youFinished;
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
    />
  ) : null;

  // While racing, the roster sits at the TOP (compact + height-capped),
  // and the passage fills ALL the remaining space below it, centring its
  // text within that space. (We used to mirror the roster at the bottom
  // to centre on the viewport, but that doubled the roster's footprint
  // and crushed the passage to nothing once a lobby had several racers.)
  if (racing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Roster at the top, fully visible. mb gives the passage /
         *  spectator content below it real breathing room so the text
         *  never crowds the player-list card. */}
        {lineupEl ? (
          <div className="mb-4 shrink-0 sm:mb-6">{lineupEl}</div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1">
            {showSpectator ? (
              <SpectatorPassage words={state.words} racers={state.racers} />
            ) : (
              <Passage wordBackground={wordTints} wordTextColor={wordTextColor} />
            )}
          </div>
          {quoteSource ? <QuoteAttribution source={quoteSource} /> : null}
        </div>
      </div>
    );
  }

  // Pre-race (matching / lobby / countdown): the racetrack + lobby card
  // stack in normal flow above the poster — there's no passage to
  // centre yet, so the in-flow stack reads cleanly.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {lineupEl}
      <ChallengeLobby />
      <div className="min-h-0 flex-1">
        {state.phase === "countdown" ? (
          <CountdownPanel n={countdownNumber ?? 3} />
        ) : (
          <RacePoster
            modeName={RACE_MODES[state.modeId].name}
            detail={RACE_MODES[state.modeId].detail}
            phase={state.phase}
            quoteSource={quoteSource}
          />
        )}
      </div>
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
/** Editorial dash + author line that sits under the passage during
 *  racing in QUOTE rooms. Right-aligned, muted, JetBrains Mono — the
 *  attribution should read as a footnote, never compete with the
 *  passage above it. */
function QuoteAttribution({ source }: { source: string }) {
  return (
    <p
      className={cn(
        "px-1 text-right text-[12px] text-muted-foreground sm:text-[13px]",
        "italic tabular-nums",
      )}
    >
      — {source}
    </p>
  );
}

function RacePoster({
  modeName,
  detail,
  phase,
  quoteSource,
}: {
  modeName: string;
  detail: string;
  phase: string;
  /** Author attribution to render under the detail line in QUOTE
   *  rooms during the lobby beats. Skipped silently for other modes. */
  quoteSource?: string;
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
      {quoteSource ? (
        <span className="mt-1 text-[12px] italic text-muted-foreground sm:text-[13px]">
          — {quoteSource}
        </span>
      ) : null}
    </div>
  );
}

