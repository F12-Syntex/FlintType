"use client";

import { useRace } from "./race-state";

const W = 1280;
const H = 110;

/** Live WPM-over-time SVG for every racer. Per-racer paths grow as
 *  the trace sample interval (1Hz) appends new points to state.trace.
 *  Y axis auto-scales to the peak WPM observed + a small headroom
 *  so the curves don't flat-line against the top edge after the
 *  fastest bot reaches its target. */
export function RaceTrace() {
  const { state } = useRace();
  const samples = state.trace;
  const racers = state.racers;
  const peak = Math.max(220, ...samples.flatMap((s) =>
    Object.values(s.wpmByRacer),
  ));
  const MAX = Math.ceil(peak / 20) * 20 + 20;
  const youId = racers.find((r) => r.isYou)?.id ?? "you";
  const xFor = (t: number) =>
    samples.length <= 1 ? 0 : (t / Math.max(1, samples[samples.length - 1]!.t)) * W;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
          RACE TRACE · ALL RACERS · WPM/SEC
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ft-warm-2">
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
            stroke="#221F1A"
            strokeDasharray="2 4"
          />
        ))}
        {samples.length >= 2
          ? racers.map((r) => {
              const pts = samples.map((s) => ({
                x: xFor(s.t),
                y: H - ((s.wpmByRacer[r.id] ?? 0) / MAX) * H,
              }));
              const path = pts
                .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ");
              const isYou = r.id === youId;
              return (
                <path
                  key={r.id}
                  d={path}
                  fill="none"
                  stroke={isYou ? "var(--color-ft-ember)" : strokeFor(r.id)}
                  strokeWidth={isYou ? 2 : 1.2}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })
          : null}
      </svg>
    </div>
  );
}

/** Bot colours along the warm-ink ramp so the trace never competes
 *  with the brand spark — only the human racer gets ember. */
function strokeFor(id: string): string {
  switch (id) {
    case "damiel":
      return "var(--color-ft-paper)";
    case "selan":
      return "#9C978A";
    case "kassia":
      return "#6E695F";
    default:
      return "#5C5950";
  }
}
