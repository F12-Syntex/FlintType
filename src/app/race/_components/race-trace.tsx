"use client";

import { useRace } from "./race-state";

/** Static post-race speed chart: one line per racer, WPM over the race.
 *  All samples already exist in `state.trace` by the time this mounts,
 *  so the SVG draws once (no live curve pulling the eye mid-race). Your
 *  line is the orange one; opponents are graded ink. */
export function RaceTrace() {
  const { state } = useRace();
  const samples = state.trace;
  if (samples.length < 2) return null;
  const W = 1280;
  const H = 120;
  const peak = Math.max(
    140,
    ...samples.flatMap((s) => Object.values(s.wpmByRacer)),
  );
  const MAX = Math.ceil(peak / 20) * 20 + 20;
  const lastT = Math.max(1, samples[samples.length - 1]!.t);
  return (
    <section aria-label="Speed over the race" className="flex flex-col gap-3 px-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Speed over the race</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          Peak {peak} wpm
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        role="img"
        aria-label={`Words per minute over the race, peaking at ${peak}`}
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
            vectorEffect="non-scaling-stroke"
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
