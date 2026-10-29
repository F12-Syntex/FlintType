"use client";

import { useMemo } from "react";
import { perKey } from "@/lib/format-figure";
import { fingerForChar, handOf } from "@/lib/keystrokes/key-map";
import { letterGaps } from "@/lib/typing-analysis/pace";
import { median } from "@/lib/typing-analysis/stats";
import { cn } from "@/lib/utils";
import type { RunInput } from "@/types/typing-analysis";
import { InsightCard } from "./insight-card";
import type { KeyEvent } from "./practice-state";
import type { RunAnalysisView } from "./use-run-analysis";

/** Optional result cards (Settings > Stats & results), all ink. Each
 *  derives its data from the run itself; nothing reaches outside it. */

/* ─── Slowest letters ──────────────────────────────────────────── */

const MIN_GAPS = 3;
const MAX_ROWS = 8;

type LetterStat = { ch: string; medianMs: number };

/** Clean gaps inside words only (`letterGaps`): a word's first letter
 *  and the key after a mistake never count. A letter needs 3 gaps, and
 *  letters rank by their median. */
function slowestLetters(input: RunInput): LetterStat[] {
  const by = new Map<string, number[]>();
  for (const g of letterGaps(input)) {
    const list = by.get(g.letter);
    if (list) list.push(g.ms);
    else by.set(g.letter, [g.ms]);
  }
  return [...by.entries()]
    .filter(([, ms]) => ms.length >= MIN_GAPS)
    .map(([ch, ms]) => ({ ch, medianMs: median(ms) }))
    .sort((a, b) => b.medianMs - a.medianMs || (a.ch < b.ch ? -1 : 1))
    .slice(0, MAX_ROWS);
}

export function PerLetterSlowness({ input }: { input: RunInput }) {
  const rows = useMemo(() => slowestLetters(input), [input]);
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map((r) => r.medianMs));
  return (
    <InsightCard label="Slowest letters" meta="Time per key">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-6">
        {rows.map((r, i) => (
          <li
            key={r.ch}
            className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 font-mono text-sm tabular-nums"
          >
            <span className="font-semibold text-foreground">{r.ch}</span>
            <span
              aria-hidden
              className="relative h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 origin-left rounded-full",
                  i === 0 ? "bg-foreground/70" : "bg-foreground/35",
                )}
                style={{
                  transform: `scaleX(${Math.max(0.04, r.medianMs / max)})`,
                  width: "100%",
                }}
              />
            </span>
            <span className="text-muted-foreground">{perKey(r.medianMs)}</span>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}

/* ─── Hand split ───────────────────────────────────────────────── */

type HandCounts = { left: number; right: number; total: number };

/** Correct letters by the hand that types them on QWERTY. Digits and
 *  symbols are left out. */
function handCounts(events: readonly { expected: string; correct: boolean }[]): HandCounts {
  const out = { left: 0, right: 0, total: 0 };
  for (const e of events) {
    if (!e.correct) continue;
    const ch = e.expected.toLowerCase();
    if (!/^[a-z]$/.test(ch)) continue;
    const finger = fingerForChar(ch);
    if (!finger) continue;
    out.total += 1;
    if (handOf(finger) === "L") out.left += 1;
    else out.right += 1;
  }
  return out;
}

/** Whether the split means anything: the run's keys behaved like QWERTY
 *  on a keyboard. With no key-code evidence (the live clone, the settings
 *  preview, a run under 20 letters) it falls back to the on-screen
 *  keyboard's layout setting (spec-50 §7.3). */
function qwertyRun(view: RunAnalysisView | null, keymapLayout: string): boolean {
  const ctx = view?.input.ctx;
  if (ctx?.input === "touch" || ctx?.input === "mixed") return false;
  if (ctx?.codeMatch !== undefined && view) return view.analysis.quality.qwerty;
  return keymapLayout === "qwerty";
}

export function HandSplit({
  events,
  view,
  keymapLayout,
}: {
  events: readonly KeyEvent[];
  view: RunAnalysisView | null;
  keymapLayout: string;
}) {
  const stats = useMemo(() => handCounts(view?.input.timings ?? events), [view, events]);
  if (stats.total < 4) return null;
  const qwerty = qwertyRun(view, keymapLayout);
  const leftPct = Math.round((stats.left / stats.total) * 100);
  const rightPct = 100 - leftPct;
  return (
    <InsightCard label="Hand split" meta={qwerty ? `From ${stats.total} letters` : undefined}>
      {qwerty ? (
        <div className="flex flex-col gap-2">
          <div aria-hidden className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <span className="bg-foreground/70" style={{ width: `${leftPct}%` }} />
            <span className="bg-foreground/30" style={{ width: `${rightPct}%` }} />
          </div>
          <div aria-hidden className="flex justify-between text-sm tabular-nums text-muted-foreground">
            <span>
              Left <span className="font-semibold text-foreground">{leftPct}%</span>
            </span>
            <span>
              Right <span className="font-semibold text-foreground">{rightPct}%</span>
            </span>
          </div>
          <p className="sr-only">
            Your left hand typed {stats.left} of the {stats.total} letters and your right hand typed {stats.right}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Hand split works with a QWERTY keyboard.</p>
      )}
    </InsightCard>
  );
}
