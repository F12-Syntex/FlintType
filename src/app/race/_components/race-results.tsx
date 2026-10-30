"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LogOut, RotateCcw } from "lucide-react";
import { StatusText } from "@/components/analysis/status-text";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format-duration";
import { ordinal, provisionalLine, summaryLine } from "./race-result-copy";
import { useRace } from "./race-state";
import { SpectatorResults } from "./race-results-spectator";
import { RaceStandings } from "./race-standings";
import { RaceTrace } from "./race-trace";
import { Stat } from "./result-stat";
import { useLeaveRace } from "./use-leave-race";
import { useSaveRaceImage } from "./use-save-race-image";

/** Track whether the local user already cast a rematch vote on the
 *  current finished round. Read from the server snapshot
 *  (`rematchReady` list) for source-of-truth, plus a local optimistic
 *  flag for the moment between click and the next snapshot. The
 *  subtree re-mounts when the new round starts, so the optimistic
 *  flag resets cleanly without manual cleanup. */

/** Post-race results card (ui-law §21 card: rounded-2xl, shadow-card).
 *  Mounts once you've crossed the line. Top to bottom: your place +
 *  one summary line with the actions beside it (Rematch is the one
 *  orange CTA; Save image and Leave are quiet ghosts), your WPM as the
 *  big orange number with accuracy beside it and a quiet secondary row
 *  (raw / characters / errors / time), the speed chart, and the
 *  standings table — so the loop closes inside one card.
 *
 *  Tab is inert during a race (it would otherwise reset your run);
 *  rematch is the visible button on this card, not a keyboard
 *  shortcut. */
export function RaceResults() {
  const {
    state,
    rematch,
    rematchReady,
    onlineSessionToken,
    isHost,
    isChallenge,
  } = useRace();
  const you = state.racers.find((r) => r.isYou) ?? null;
  // One leave path for every exit: drops the seat, clears a private
  // lobby's cached host handle and lands on /race (never strands the
  // user on a dead /race/c/<slug> URL).
  const leave = useLeaveRace();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { exporting, save: saveImage } = useSaveRaceImage(panelRef);
  const [rematchClicked, setRematchClicked] = useState(false);

  // Source of truth: did the server ack our vote? Plus optimistic
  // local state so the button flips the moment the user clicks.
  const remoteVoted =
    onlineSessionToken != null &&
    (rematchReady ?? []).includes(onlineSessionToken);
  const voted = remoteVoted || rematchClicked;
  const readyCount = (rematchReady ?? []).length;
  const realCount = state.racers.filter(
    (r) => r.bot == null && !r.disconnected,
  ).length;
  const required = Math.max(1, Math.min(2, realCount));
  const waitingForOthers = voted && required > 1 && readyCount < required;

  const [actionError, setActionError] = useState<string | null>(null);

  // The vote call soft-fails (the SSE snapshot is the source of truth),
  // so if the server hasn't acked our vote a few seconds after the click
  // — and no new round has started, which would unmount this card — the
  // vote was lost: put the button back and say so (ui-law §6.3).
  useEffect(() => {
    if (!rematchClicked || remoteVoted) return;
    const t = setTimeout(() => {
      setRematchClicked(false);
      setActionError("Couldn't send your rematch vote. Try again.");
    }, 5000);
    return () => clearTimeout(t);
  }, [rematchClicked, remoteVoted]);

  const onRematch = useCallback(() => {
    setActionError(null);
    setRematchClicked(true);
    rematch();
  }, [rematch]);
  const onForceRematch = useCallback(() => {
    setActionError(null);
    setRematchClicked(true);
    rematch(true);
  }, [rematch]);
  const onDownload = useCallback(async () => {
    setActionError(null);
    if (!(await saveImage())) setActionError("Couldn't save the image. Try again.");
  }, [saveImage]);
  // Two surfaces: the room is fully finished (every racer crossed),
  // OR the local user has finished but bots / other real players
  // are still mid-race. In the second case we show your results
  // immediately — no need to wait on slower racers — and the live
  // player strip above still ticks while the room wraps up.
  // A pure spectator (joined a full/started lobby) has no "you" racer:
  // once the race is over they get the standings-only card (winner,
  // standings, "Find a race"), never a personal results panel.
  if (!you) return state.phase === "finished" ? <SpectatorResults /> : null;
  const allFinished = state.phase === "finished";
  const youFinished = you.finishedAt != null;
  if (!allFinished && !youFinished) return null;

  const total = state.racers.length;
  // While the room is still racing, rank by *live* net WPM — the same
  // metric the server uses for the final placement — so the standings
  // update as each racer crosses and a run that finished first but at
  // low accuracy sits where its net WPM actually lands (not at the top
  // on finish-order). Once allFinished, the server's net-WPM `place` is
  // the source of truth and we order by that.
  type Racer = (typeof state.racers)[number];
  const byLiveNet = (a: Racer, b: Racer) => {
    if (a.disconnected !== b.disconnected) return a.disconnected ? 1 : -1;
    // r.wpm is already net (correct chars / 5 / min), so rank by it
    // directly — applying netWpm again would penalize accuracy twice.
    const d = b.wpm - a.wpm;
    if (d !== 0) return d;
    return (a.finishedAt ?? Infinity) - (b.finishedAt ?? Infinity);
  };
  const ordered = allFinished
    ? [...state.racers].sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
    : [...state.racers].sort(byLiveNet);
  const rankOf = (r: Racer) =>
    allFinished ? (r.place ?? total) : ordered.indexOf(r) + 1;
  const place = rankOf(you);
  const stillRacing = state.racers.filter(
    (r) => r.finishedAt == null && !r.disconnected,
  ).length;
  return (
    <div
      ref={panelRef}
      className="flex shrink-0 flex-col gap-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:gap-8 sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {allFinished ? (
              "Race finished"
            ) : (
              <StatusText tone="live" className="text-xs font-medium">
                Race in progress
              </StatusText>
            )}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {ordinal(place)} place
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {allFinished
              ? summaryLine(place, total, you.finishedAt ?? 0)
              : provisionalLine(place, total, stillRacing)}
          </p>
        </div>
        <div
          data-no-export="true"
          className="flex w-full flex-col gap-2 sm:w-auto sm:items-end"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Rematch only makes sense once the race is actually over —
             *  the server rejects a ready-vote while the room is still
             *  racing. Until then the card is your live standing; just
             *  Save image / Leave are offered. */}
            {!allFinished ? null : voted ? (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-primary/40 bg-primary/10 px-6 text-[0.9375rem] font-semibold text-primary sm:w-auto"
              >
                {waitingForOthers ? (
                  <>
                    Ready,{" "}
                    <span className="tabular-nums text-primary/70">
                      {readyCount} of {required}
                    </span>
                  </>
                ) : (
                  "Starting…"
                )}
              </span>
            ) : (
              <Button
                size="lg"
                onClick={onRematch}
                className="w-full px-8 sm:w-auto"
              >
                <RotateCcw aria-hidden />
                Rematch
              </Button>
            )}
            {/* Host-only force-rematch — mirrors the lobby's "Force start
             *  now". Lets the host kick off the next round without waiting
             *  on slower racers to vote. Only meaningful when another real
             *  player could hold it up (required > 1); with one real racer
             *  the host's Rematch click already starts instantly. */}
            {allFinished && isHost && isChallenge && required > 1 ? (
              <Button variant="outline" size="lg" onClick={onForceRematch}>
                Force rematch
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              disabled={exporting}
              aria-label="Save results as image"
              className="h-11 text-muted-foreground sm:h-8"
            >
              <Download aria-hidden />
              {exporting ? "Saving…" : "Save image"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={leave}
              className="h-11 text-muted-foreground sm:h-8"
            >
              <LogOut aria-hidden />
              Leave
            </Button>
          </div>
          {actionError ? (
            <p role="alert" className="text-sm text-destructive sm:text-right">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>

      {/* All headline stats read the server-authoritative racer row —
          the SAME source the standings table uses — so your headline
          and your table row can never disagree (#4/#7). WPM is the one
          orange number; everything else stays ink. */}
      <div className="flex flex-col gap-5 px-1">
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
          <Stat label="WPM" value={String(you.wpm)} size="hero" />
          <Stat label="Accuracy" value={`${you.accuracy.toFixed(1)}%`} size="lg" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="Raw WPM" value={String(you.raw)} />
          <Stat label="Characters" value={String(you.correctChars)} />
          <Stat label="Errors" value={String(you.errors)} />
          <Stat label="Time" value={formatClock(you.finishedAt ?? 0)} />
        </div>
      </div>

      <RaceTrace />

      <RaceStandings ordered={ordered} rankOf={rankOf} />
    </div>
  );
}
