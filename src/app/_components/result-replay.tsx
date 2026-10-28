"use client";

import { Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import type { KeyEvent } from "./practice-state";
import { reconstructCursor } from "./replay-cursor";

const SPEEDS = [
  { value: 0.5, label: "0.5×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
] as const;

/** Plays the finished run back keystroke by keystroke at its real
 *  timing (or 0.5× / 2×), then returns to the result screen. */
export function ReplayView({
  words,
  events,
  typedCount,
  onExit,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
  /** How many words the user actually produced input for (`state.typed`
   *  length). The honest "what you typed" cap — correctness-independent,
   *  unlike the reconstructed cursor which only advances on correct keys. */
  typedCount: number;
  onExit: () => void;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    if (paused) return;
    if (step >= events.length) {
      const id = setTimeout(onExit, 1500);
      return () => clearTimeout(id);
    }
    const cur = events[step]!;
    const next = events[step + 1];
    const realDelay = next ? Math.max(20, next.t - cur.t) : 600;
    const id = setTimeout(() => setStep((s) => s + 1), realDelay / speed);
    return () => clearTimeout(id);
  }, [step, events, paused, speed, onExit]);

  const { wordIdx, charIdx, errorWords } = useMemo(
    () => reconstructCursor(events, words, step),
    [events, words, step],
  );

  // Timed tests keep a deep buffer of upcoming words past where the user
  // actually typed. Mirror only the span the user typed, not the whole
  // buffer — otherwise a 15s run renders hundreds of grey untyped words.
  // No-op for words/quote runs, where typedCount reaches the full length.
  const displayWords = useMemo(
    () => words.slice(0, Math.min(words.length, Math.max(1, typedCount))),
    [words, typedCount],
  );

  const pct =
    events.length > 0 ? Math.min(100, Math.round((step / events.length) * 100)) : 0;
  const elapsed = step > 0 && events[step - 1] ? events[step - 1]!.t : 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden py-6">
      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">Replay</span>
            <span aria-hidden> · </span>
            {pct}%<span aria-hidden> · </span>
            {(elapsed / 1000).toFixed(1)}s
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              ariaLabel="Replay speed"
              value={speed}
              onValueChange={setSpeed}
              options={SPEEDS}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {paused ? "Play" : "Pause"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit}>
              <Square aria-hidden />
              Stop
            </Button>
          </div>
        </div>

        <div
          aria-hidden
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="font-mono text-xl leading-[1.7] tracking-[0.04em]">
          {displayWords.map((word, wi) => (
            <span key={wi}>
              {[...word].map((ch, ci) => {
                const typed = wi < wordIdx || (wi === wordIdx && ci < charIdx);
                const cls = !typed
                  ? "text-muted-foreground"
                  : errorWords.has(wi)
                    ? "text-[var(--ft-passage-error,var(--destructive))] underline decoration-1 underline-offset-[6px]"
                    : "text-foreground";
                const isCursor = wi === wordIdx && ci === charIdx;
                return (
                  <span
                    key={ci}
                    className={cn(cls, isCursor && "border-l-2 border-primary")}
                  >
                    {ch}
                  </span>
                );
              })}
              {wi < displayWords.length - 1 ? (
                <span className="text-muted-foreground"> </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
