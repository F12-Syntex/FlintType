"use client";

import { useRace } from "./race-state";

/** Post-race speed chart: one line per racer, WPM per race second
 *  (samples recorded client-side by `useRaceTrace`). Mounts inside the
 *  results card once you've crossed, so it never pulls the eye mid-race.
 *  Your line is the orange one; opponents are graded ink. A racer's line
 *  ends where they crossed the finish. */
export function RaceTrace() {
  const { state } = useRace();
  const samples = state.trace;
  if (samples.length < 2) return null;
  const W = 1280;
  const H = 120;
  const values = samples.flatMap((s) => Object.values(s.wpmByRacer));
  const peak = Math.max(0, ...values);
  // Your final speed counts too, so the label never reads below the
  // WPM the results card shows (each line normally ends on it anyway).
  const you = state.racers.find((r) => r.isYou);
  const traced = Math.max(0, ...samples.map((s) => s.wpmByRacer.you ?? 0));
  const yourPeak =
    traced > 0 && you?.finishedAt != null
      ? Math.max(traced, Math.round(you.wpm))
      : traced;
  const MAX = Math.max(60, Math.ceil(peak / 20) * 20 + 20);
  const lastT = Math.max(1, samples[samples.length - 1]!.t);
  const firstT = samples[0]!.t;
  const span = Math.max(1, lastT - firstT);
  const grid = [0.25, 0.5, 0.75].map((f) => Math.round((MAX * f) / 10) * 10);
  return (
    <section aria-label="Speed over the race" className="flex flex-col gap-3 px-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Speed over the race</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {yourPeak > 0 ? "Your peak" : "Peak"}{" "}
          <span className="font-semibold text-foreground">{yourPeak || peak}</span> wpm
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        role="img"
        aria-label={`Words per minute over the race, peaking at ${peak}`}
        className="block overflow-visible"
      >
        {grid.map((v) => (
          <line
            key={v}
            x1={0}
            x2={W}
            y1={H - (v / MAX) * H}
            y2={H - (v / MAX) * H}
            stroke="var(--border)"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Solid zero line: without it the band under the lowest dashed
         *  rule read as empty space rather than the bottom of the scale. */}
        <line
          x1={0}
          x2={W}
          y1={H}
          y2={H}
          stroke="var(--border)"
          vectorEffect="non-scaling-stroke"
        />
        {/* Opponents first so your orange line paints on top. */}
        {[...state.racers]
          .sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? 1 : -1))
          .map((r) => {
            const pts = samples.flatMap((s) => {
              const v = s.wpmByRacer[r.id];
              return v == null
                ? []
                : [{ x: ((s.t - firstT) / span) * W, y: H - (v / MAX) * H }];
            });
            if (pts.length < 2) return null;
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
                strokeWidth={isYou ? 2.5 : 1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
      </svg>
    </section>
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
