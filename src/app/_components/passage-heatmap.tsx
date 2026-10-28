"use client";

import { useMemo } from "react";
import type { KeyEvent } from "./practice-state";

/** Render the run's source passage with each character coloured by its
 *  *speed* — fast = foreground (white/black per theme), slow = primary
 *  full. The 10th–90th-percentile range becomes the colour scale so a
 *  single outlier (a yawn) doesn't crush the gradient. */
export function PassageHeatmap({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  const latencyByPos = useMemo(() => {
    const map = new Map<string, number>();
    let w = 0;
    let c = 0;
    let prevT = 0;
    for (const e of events) {
      if (!e.correct) continue;
      const word = words[w];
      if (!word) break;
      map.set(`${w}:${c}`, Math.max(0, e.t - prevT));
      prevT = e.t;
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    }
    return map;
  }, [events, words]);

  const [lo, hi] = useMemo(() => {
    const sorted = [...latencyByPos.values()].sort((a, b) => a - b);
    if (sorted.length < 4) return [0, 1] as const;
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return [p10, Math.max(p90, p10 + 1)] as const;
  }, [latencyByPos]);

  if (words.length === 0) return null;

  return (
    <div className="font-mono text-base leading-[1.7] tracking-[0.04em] [word-spacing:0.25em]">
      {words.map((word, wi) => (
        <span key={wi}>
          {[...word].map((ch, ci) => {
            const lat = latencyByPos.get(`${wi}:${ci}`);
            if (lat == null) {
              return (
                <span key={ci} className="text-muted-foreground/60">
                  {ch}
                </span>
              );
            }
            const span = hi - lo;
            const intensity =
              span > 0 ? Math.max(0, Math.min(1, (lat - lo) / span)) : 0;
            const pct = Math.round(intensity * 100);
            return (
              <span
                key={ci}
                style={{
                  color: `color-mix(in oklch, var(--primary) ${pct}%, var(--foreground))`,
                }}
                title={`${Math.round(lat)} ms`}
              >
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 ? (
            <span className="text-muted-foreground/60">{" "}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
