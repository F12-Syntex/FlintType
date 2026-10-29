"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { KeyEvent } from "./practice-state";

/** The four-step ink ramp, fastest first, on the text colour. Validated
 *  with the dataviz ordinal checks against the card in light and dark
 *  (monotone, adjacent ΔL ≥ 0.06, fastest step 4.6:1). The slowest step
 *  is also bold, so colour is never the only cue. */
const RAMP = [
  "color-mix(in oklch, var(--foreground) 55%, var(--card))",
  "color-mix(in oklch, var(--foreground) 70%, var(--card))",
  "color-mix(in oklch, var(--foreground) 85%, var(--card))",
  "var(--foreground)",
] as const;

/** Time since the previous correct key for each correctly typed letter,
 *  keyed `word:column`. The column is the event's own `pos` when it has
 *  one (v2); otherwise a running column within the word, where a wrong
 *  key moves it on unless the next correct key in that word re-types the
 *  same letter (a fixed or blocked slip). Wrong keys never set the
 *  latency origin. */
function latencies(events: readonly KeyEvent[]): Map<string, number> {
  const map = new Map<string, number>();
  let word = -1;
  let col = 0;
  let prevT: number | null = null;
  events.forEach((e, i) => {
    if (e.wordIndex !== word) {
      word = e.wordIndex;
      col = 0;
    }
    const at = e.pos ?? col;
    if (e.correct) {
      map.set(`${e.wordIndex}:${at}`, prevT === null ? 0 : Math.max(0, e.t - prevT));
      prevT = e.t;
      col = at + 1;
      return;
    }
    const next = events.slice(i + 1).find((n) => n.correct || n.wordIndex !== e.wordIndex);
    const retyped = next !== undefined && next.correct && next.wordIndex === e.wordIndex && next.expected === e.expected;
    if (!retyped) col = at + 1;
  });
  return map;
}

/** The run's text, each letter tinted by how long it took: four ink
 *  steps over the 10th–90th percentile range, so one long stop doesn't
 *  flatten the rest. Untyped letters stay faint. */
export function PassageHeatmap({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  const latencyByPos = useMemo(() => latencies(events), [events]);

  const [lo, hi] = useMemo(() => {
    const sorted = [...latencyByPos.values()].sort((a, b) => a - b);
    if (sorted.length < 4) return [0, 1] as const;
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return [p10, Math.max(p90, p10 + 1)] as const;
  }, [latencyByPos]);

  if (words.length === 0) return null;

  return (
    <div className="flex flex-col">
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
              const intensity = Math.max(0, Math.min(1, (lat - lo) / (hi - lo)));
              const step = Math.min(RAMP.length - 1, Math.floor(intensity * RAMP.length));
              return (
                <span
                  key={ci}
                  className={cn(step === RAMP.length - 1 && "font-semibold")}
                  style={{ color: RAMP[step] }}
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
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
        <span>Faster</span>
        {RAMP.map((c) => (
          <span key={c} className="size-2.5 rounded-sm" style={{ background: c }} />
        ))}
        <span>Slower</span>
      </div>
    </div>
  );
}
