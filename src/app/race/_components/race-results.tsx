"use client";

import { countChars } from "@/lib/wpm";
import { cn } from "@/lib/utils";
import { usePractice } from "../../_components/practice-state";
import { RACE_MODES } from "./race-data";
import { useRace } from "./race-state";

/** Post-race summary panel. Mounts only after every racer has
 *  crossed the line. Hosts the placement headline, a five-cell stat
 *  strip (WPM / accuracy / chars / errors / time), the static
 *  WPM-trace SVG, the per-racer leaderboard table, and the
 *  Race-again CTA so the loop closes inside one screen.
 *
 *  The Tab key is wired to the same Race-again action from the race
 *  state's window keydown handler — pressing Tab on this surface
 *  jumps straight to a new race. */
export function RaceResults() {
  const { state, restart } = useRace();
  const { state: practice } = usePractice();
  const you = state.racers.find((r) => r.isYou)!;
  // Two surfaces: the room is fully finished (every racer crossed),
  // OR the local user has finished but bots / other real players
  // are still mid-race. In the second case we show your results
  // immediately — no need to wait on slower racers — and the live
  // player strip above still ticks while the room wraps up.
  const allFinished = state.phase === "finished";
  const youFinished = you.finishedAt != null;
  if (!allFinished && !youFinished) return null;
  const place = you.place ?? state.racers.length;
  const ordered = [...state.racers].sort(
    (a, b) => (a.place ?? 99) - (b.place ?? 99),
  );
  const mode = RACE_MODES[state.modeId];
  const isBurst = mode.kind === "burst";
  // Burst mode doesn't drive PracticeProvider, so countChars(practice.*)
  // is 0 / 0. Render burst-flavoured stats instead — items cleared
  // out of the catalog, plus the racer's last committed burst WPM.
  const counts = isBurst
    ? null
    : countChars(practice.typed, practice.words, true);
  const charsTyped = counts ? counts.allCorrectChars + counts.correctSpaces : 0;
  const errors = counts ? counts.incorrectChars + counts.extraChars : 0;
  const yourAcc = isBurst
    ? null
    : accuracyFromTyped(practice.typed, practice.words);
  const burstItemsCleared = isBurst ? you.burstItemIdx ?? 0 : 0;
  const burstItemsTotal = isBurst && mode.burst ? mode.burst.items.length : 0;
  return (
    <div className="flex flex-col gap-7 rounded-md border border-border bg-card px-7 py-8 sm:px-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Race finished
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-[40px]">
            {place === 1
              ? "Race won."
              : place === state.racers.length
                ? "Last across."
                : `Finished ${ordinal(place)}.`}
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
            {summaryLine(place, state.racers.length, you.finishedAt ?? 0)}
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-md bg-primary px-4 py-2.5 sm:self-auto",
            "text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground",
            "transition-colors hover:bg-primary/90 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
        >
          Race again
          <span className="text-[9px] tracking-[0.2em] text-primary-foreground/70">
            · TAB
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border/70 py-5 sm:grid-cols-6 sm:gap-x-10">
        <Stat
          label="net wpm"
          value={String(
            netWpm(you.wpm, isBurst ? you.accuracy : yourAcc ?? you.accuracy),
          )}
          accent
        />
        <Stat label="raw wpm" value={String(you.wpm)} />
        {isBurst ? (
          <>
            <Stat
              label="accuracy"
              value={`${you.accuracy.toFixed(1)}%`}
            />
            <Stat
              label="items cleared"
              value={`${burstItemsCleared}/${burstItemsTotal}`}
            />
            <Stat label="gate wpm" value={String(mode.burst?.thresholdWpm ?? 0)} />
          </>
        ) : (
          <>
            <Stat label="accuracy" value={`${(yourAcc ?? 0).toFixed(1)}%`} />
            <Stat label="chars typed" value={String(charsTyped)} />
            <Stat label="errors" value={String(errors)} />
          </>
        )}
        <Stat label="time" value={formatT(you.finishedAt ?? 0)} />
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
          const placedFirst = (r.place ?? 99) === 1;
          const net = netWpm(r.wpm, r.accuracy);
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
                {r.place ?? "—"}
              </span>
              <span
                className={cn(
                  "truncate font-semibold",
                  r.isYou ? "text-primary" : "text-foreground",
                )}
              >
                {r.name}
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
                {r.wpm}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {Math.round(r.accuracy)}%
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {formatT(r.finishedAt ?? 0)}
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
    case "selan":
      return "color-mix(in oklch, var(--foreground) 55%, transparent)";
    case "kassia":
      return "color-mix(in oklch, var(--foreground) 35%, transparent)";
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
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function summaryLine(place: number, total: number, time: number): string {
  if (place === 1) {
    return `Cleared the passage in ${formatT(time)} — fastest across the line. Queue another to defend.`;
  }
  if (place === total) {
    return `Bots took the line first this time. Queue another and aim for the next slot up.`;
  }
  return `Solid run — ${formatT(time)} on the clock. The leader's still up the page.`;
}

function accuracyFromTyped(
  typed: readonly string[],
  words: readonly string[],
): number {
  const counts = countChars(typed, words, true);
  const correct = counts.allCorrectChars;
  const wrong = counts.incorrectChars + counts.extraChars;
  if (correct + wrong === 0) return 100;
  return Math.round((correct / (correct + wrong)) * 1000) / 10;
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Accuracy-adjusted WPM — the canonical "score" metric for both
 *  practice and race surfaces. Reads as raw_wpm × accuracy/100, so
 *  a 100-wpm run at 90 % accuracy lands at 90 net. Bots default to
 *  100 % accuracy so their net equals their raw. */
export function netWpm(wpm: number, accuracy: number): number {
  if (!Number.isFinite(wpm) || wpm <= 0) return 0;
  const a = Math.max(0, Math.min(100, accuracy));
  return Math.round(wpm * (a / 100));
}
