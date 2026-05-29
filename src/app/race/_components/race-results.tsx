"use client";

import { useCallback, useRef, useState } from "react";
import { Download } from "lucide-react";
import { formatClock } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import { useRace } from "./race-state";

/** Track whether the local user already cast a rematch vote on the
 *  current finished round. Read from the server snapshot
 *  (`rematchReady` list) for source-of-truth, plus a local optimistic
 *  flag for the moment between click and the next snapshot. The
 *  subtree re-mounts when the new round starts, so the optimistic
 *  flag resets cleanly without manual cleanup. */

/** Post-race summary panel. Mounts only after every racer has
 *  crossed the line. Hosts the placement headline, a five-cell stat
 *  strip (WPM / accuracy / chars / errors / time), the static
 *  WPM-trace SVG, the per-racer leaderboard table, and the
 *  Race-again CTA so the loop closes inside one screen.
 *
 *  Tab is inert during a race (it would otherwise reset your run);
 *  rematch is the visible "Race again" button on this panel, not a
 *  keyboard shortcut. */
export function RaceResults() {
  const {
    state,
    rematch,
    rematchReady,
    onlineSessionToken,
    abandon,
  } = useRace();
  const you = state.racers.find((r) => r.isYou) ?? null;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
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

  const onRematch = useCallback(() => {
    setRematchClicked(true);
    rematch();
  }, [rematch]);
  const onDownload = useCallback(async () => {
    // Capture the whole content area (data-screenshot-root on
    // AppChrome's main scroller) rather than just this panel, so the
    // PNG reads as a page snapshot — passage, lineup, results, the
    // race trace — instead of an orphaned card. Fallback to the
    // panel keeps the export working if this component is ever
    // mounted outside the app shell.
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot(panelRef.current);
    if (!node || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const bg = pickScreenshotBg(node);
      const { width, height } = naturalScreenshotSize(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: bg,
        width,
        height,
        filter: (n) => !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-race-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[race-results] screenshot failed", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);
  // Two surfaces: the room is fully finished (every racer crossed),
  // OR the local user has finished but bots / other real players
  // are still mid-race. In the second case we show your results
  // immediately — no need to wait on slower racers — and the live
  // player strip above still ticks while the room wraps up.
  // A pure spectator (joined a full/started lobby) has no "you" racer —
  // they never get a personal results panel.
  if (!you) return null;
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
      className="flex flex-col gap-7 rounded-md border border-border bg-card px-7 py-8 sm:px-9"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {allFinished ? "Race finished" : "You finished · race in progress"}
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-[40px]">
            {ordinal(place)} place
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
            {allFinished
              ? summaryLine(place, total, you.finishedAt ?? 0)
              : provisionalLine(place, total, stillRacing)}
          </p>
        </div>
        <div
          data-no-export="true"
          className="flex flex-wrap items-center gap-2 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={onDownload}
            disabled={exporting}
            aria-label="Save results as image"
            className={cn(
              "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2.5",
              "text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground",
              "transition-colors hover:bg-accent hover:text-accent-foreground active:translate-y-[1px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <Download size={14} className="shrink-0" />
            {exporting ? "Saving" : "Save image"}
          </button>
          {/* Rematch only makes sense once the race is actually over —
           *  the server rejects a ready-vote while the room is still
           *  racing. Until then the panel is your live standing; just
           *  Save image / Leave are offered. */}
          {!allFinished ? null : voted ? (
            <span
              role="status"
              aria-live="polite"
              className={cn(
                "inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/[0.06] px-4 py-2.5",
                "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary",
              )}
            >
              {waitingForOthers ? (
                <>
                  Ready{" "}
                  <span className="text-primary/70 tabular-nums">
                    {readyCount}/{required}
                  </span>
                </>
              ) : (
                "Starting…"
              )}
            </span>
          ) : (
            <button
              type="button"
              onClick={onRematch}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5",
                "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground",
                "transition-colors hover:bg-primary/90 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )}
            >
              Rematch
            </button>
          )}
          <button
            type="button"
            onClick={abandon}
            className={cn(
              "inline-flex items-center rounded-md px-3 py-2.5",
              "text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground",
              "transition-colors hover:text-foreground active:translate-y-[1px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border/70 py-5 sm:grid-cols-6 sm:gap-x-10">
        {/* All headline stats read the server-authoritative racer row —
            the SAME source the per-racer table below uses — so the local
            racer's headline and table row can never disagree (#4/#7). */}
        <Stat label="net wpm" value={String(you.wpm)} accent />
        <Stat label="raw wpm" value={String(you.raw)} />
        <Stat label="accuracy" value={`${you.accuracy.toFixed(1)}%`} />
        <Stat label="chars typed" value={String(you.correctChars)} />
        <Stat label="errors" value={String(you.errors)} />
        <Stat label="time" value={formatClock(you.finishedAt ?? 0)} />
      </div>

      <FinalTrace />

      <div className="flex flex-col">
        <div className="grid grid-cols-[28px_minmax(0,1fr)_64px_64px_56px_64px] items-baseline gap-3 border-b border-border pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>#</span>
          <span>racer</span>
          <span className="text-right">net</span>
          <span className="text-right">raw</span>
          <span className="text-right">acc</span>
          <span className="text-right">time</span>
        </div>
        {ordered.map((r) => {
          const rank = rankOf(r);
          const placedFirst = rank === 1;
          const net = r.wpm;
          const racing = r.finishedAt == null && !r.disconnected;
          return (
            <div
              key={r.id}
              className={cn(
                "grid grid-cols-[28px_minmax(0,1fr)_64px_64px_56px_64px] items-baseline gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0",
                r.isYou && "bg-primary/[0.05]",
              )}
            >
              <span
                className={cn(
                  "tabular-nums",
                  placedFirst ? "text-primary" : "text-muted-foreground",
                )}
              >
                {rank}
              </span>
              <span
                className={cn(
                  "flex min-w-0 items-center gap-1.5 truncate font-semibold",
                  r.isYou ? "text-primary" : "text-foreground",
                )}
              >
                <span className="truncate">{r.name}</span>
                {r.bot != null ? (
                  <span
                    aria-label="Bot opponent"
                    className="inline-flex shrink-0 items-center rounded-md border border-foreground/15 bg-foreground/[0.04] px-1 py-[1px] text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    Bot
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "text-right tabular-nums font-semibold",
                  r.isYou ? "text-primary" : "text-foreground",
                )}
              >
                {net}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {r.raw}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {Math.round(r.accuracy)}%
              </span>
              <span
                className={cn(
                  "text-right tabular-nums",
                  racing
                    ? "text-[10px] uppercase tracking-[0.14em] text-primary/70"
                    : "text-muted-foreground",
                )}
              >
                {racing ? "racing" : formatClock(r.finishedAt ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Static post-race trace. All samples already exist in state.trace
 *  by the time this mounts, so the SVG draws once — no live curve to
 *  pull the eye away during the race. */
function FinalTrace() {
  const { state } = useRace();
  const samples = state.trace;
  if (samples.length < 2) return null;
  const W = 1280;
  const H = 110;
  const peak = Math.max(
    140,
    ...samples.flatMap((s) => Object.values(s.wpmByRacer)),
  );
  const MAX = Math.ceil(peak / 20) * 20 + 20;
  const lastT = Math.max(1, samples[samples.length - 1]!.t);
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          RACE TRACE · WPM/SEC
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          peak {peak} wpm
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        className="block"
      >
        {[60, 120, 180].map((v) => (
          <line
            key={v}
            x1={0}
            x2={W}
            y1={H - (v / MAX) * H}
            y2={H - (v / MAX) * H}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {state.racers.map((r) => {
          const pts = samples.map((s) => ({
            x: (s.t / lastT) * W,
            y: H - ((s.wpmByRacer[r.id] ?? 0) / MAX) * H,
          }));
          const path = pts
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");
          const isYou = r.isYou;
          return (
            <path
              key={r.id}
              d={path}
              fill="none"
              stroke={isYou ? "var(--primary)" : strokeFor(r.id)}
              strokeWidth={isYou ? 2 : 1.2}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    </div>
  );
}

function strokeFor(id: string): string {
  switch (id) {
    case "damiel":
      return "color-mix(in oklch, var(--foreground) 80%, transparent)";
    case "haru":
      return "color-mix(in oklch, var(--foreground) 75%, transparent)";
    case "nadya":
      return "color-mix(in oklch, var(--foreground) 65%, transparent)";
    case "selan":
      return "color-mix(in oklch, var(--foreground) 55%, transparent)";
    case "elias":
      return "color-mix(in oklch, var(--foreground) 50%, transparent)";
    case "mireille":
      return "color-mix(in oklch, var(--foreground) 45%, transparent)";
    case "kassia":
      return "color-mix(in oklch, var(--foreground) 38%, transparent)";
    case "yusuf":
      return "color-mix(in oklch, var(--foreground) 32%, transparent)";
    case "onyx":
      return "color-mix(in oklch, var(--foreground) 28%, transparent)";
    default:
      return "var(--muted-foreground)";
  }
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums leading-none",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function summaryLine(place: number, total: number, time: number): string {
  return `${ordinal(place)} of ${total} in ${formatClock(time)}.`;
}

/** Standing line shown while the room is still racing — the placement
 *  isn't final yet, so we frame it as a live, net-WPM standing that
 *  resettles as each remaining racer crosses. (Finishing first counts
 *  for nothing if the run was inaccurate: net WPM is the score.) */
function provisionalLine(
  place: number,
  total: number,
  stillRacing: number,
): string {
  const standing = `${ordinal(place)} of ${total}`;
  if (stillRacing <= 0) return `${standing}. Finalising places.`;
  const who = stillRacing === 1 ? "1 racer" : `${stillRacing} racers`;
  return `${standing}, ${who} still typing.`;
}
