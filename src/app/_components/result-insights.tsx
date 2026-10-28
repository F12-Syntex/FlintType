"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { InsightCard } from "./insight-card";
import type { KeyEvent } from "./practice-state";

/** Extra result-screen visualisations — opt-in via appearance prefs.
 *  Every component derives its data from the run's keystroke stream
 *  + per-second wpm samples that the practice context already
 *  provides; nothing reaches outside the run. */

/* ─── Per-letter slowness ───────────────────────────────────────── */

type LetterStat = {
  ch: string;
  avgMs: number;
  samples: number;
};

function perLetter(events: readonly KeyEvent[]): LetterStat[] {
  const acc = new Map<string, { total: number; samples: number }>();
  let prevT = 0;
  let first = true;
  for (const e of events) {
    if (!e.correct || !e.expected) {
      prevT = e.t;
      first = false;
      continue;
    }
    if (first) {
      prevT = e.t;
      first = false;
      continue;
    }
    const dt = e.t - prevT;
    prevT = e.t;
    if (dt <= 0 || dt > 2000) continue;
    const key = e.expected.toLowerCase();
    const b = acc.get(key) ?? { total: 0, samples: 0 };
    b.total += dt;
    b.samples += 1;
    acc.set(key, b);
  }
  return [...acc.entries()]
    .filter(([, b]) => b.samples >= 2)
    .map(([ch, b]) => ({
      ch,
      avgMs: b.total / b.samples,
      samples: b.samples,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 8);
}

export function PerLetterSlowness({ events }: { events: readonly KeyEvent[] }) {
  const rows = useMemo(() => perLetter(events), [events]);
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map((r) => r.avgMs));
  return (
    <InsightCard
      label="Slowest letters"
      meta={`Top ${rows.length} · average ms per key`}
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6">
        {rows.map((r, i) => (
          <li
            key={r.ch}
            className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 font-mono text-sm tabular-nums"
          >
            <span className="font-semibold text-foreground">
              {r.ch === " " ? "␣" : r.ch}
            </span>
            <span
              aria-hidden
              className="relative h-1.5 overflow-hidden rounded-full bg-muted"
            >
              {/* Only the slowest letter carries the brand colour; the
               *  rest stay ink so the one that matters stands out. */}
              <span
                className={cn(
                  "absolute inset-y-0 left-0 origin-left rounded-full",
                  i === 0 ? "bg-primary" : "bg-foreground/35",
                )}
                style={{
                  transform: `scaleX(${Math.max(0.04, r.avgMs / max)})`,
                  width: "100%",
                }}
              />
            </span>
            <span className="text-muted-foreground">
              {Math.round(r.avgMs)}
              <span className="ml-0.5 text-xs opacity-70">ms</span>
            </span>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

/* ─── Hand balance ─────────────────────────────────────────────── */

const LEFT_HAND = new Set([
  "q","w","e","r","t","a","s","d","f","g","z","x","c","v","b",
]);
const RIGHT_HAND = new Set([
  "y","u","i","o","p","h","j","k","l","n","m",
]);

type HandStats = { left: number; right: number; other: number; total: number };

function handBalance(events: readonly KeyEvent[]): HandStats {
  const out = { left: 0, right: 0, other: 0, total: 0 };
  for (const e of events) {
    if (!e.expected) continue;
    const c = e.expected.toLowerCase();
    out.total += 1;
    if (LEFT_HAND.has(c)) out.left += 1;
    else if (RIGHT_HAND.has(c)) out.right += 1;
    else out.other += 1;
  }
  return out;
}

export function HandBalance({ events }: { events: readonly KeyEvent[] }) {
  const stats = useMemo(() => handBalance(events), [events]);
  if (stats.total < 4) return null;
  const leftPct = Math.round((stats.left / stats.total) * 100);
  const rightPct = Math.round((stats.right / stats.total) * 100);
  const otherPct = Math.max(0, 100 - leftPct - rightPct);
  return (
    <InsightCard label="Hand balance" meta={`${stats.total} keystrokes`}>
      <div className="flex flex-col gap-2.5">
        <div
          aria-hidden
          className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <span
            className="bg-foreground/70"
            style={{ width: `${leftPct}%` }}
          />
          <span
            className="bg-foreground/30"
            style={{ width: `${rightPct}%` }}
          />
          <span
            className="bg-foreground/10"
            style={{ width: `${otherPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
          <Legend dot="bg-foreground/70" label="Left" pct={leftPct} count={stats.left} />
          <Legend dot="bg-foreground/30" label="Right" pct={rightPct} count={stats.right} />
          {stats.other > 0 ? (
            <Legend
              dot="bg-foreground/10"
              label="Other"
              pct={otherPct}
              count={stats.other}
            />
          ) : null}
        </div>
      </div>
    </InsightCard>
  );
}

function Legend({
  dot,
  label,
  pct,
  count,
}: {
  dot: string;
  label: string;
  pct: number;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block size-2 rounded-full", dot)} />
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">
        {pct}% · {count}
      </span>
    </span>
  );
}
