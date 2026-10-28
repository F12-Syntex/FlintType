"use client";

import { Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";
import { InlineCaret } from "./burst-practice";
import type { KeyEvent } from "./practice-state";
import { reconstructCursor } from "./replay-cursor";

/** Passage colour tokens (mirrors passage.tsx) so the replay reads as
 *  the same text the user typed: typed in the passage's typed colour
 *  (the brand orange by default), untyped muted, mistakes in the error
 *  colour with the past-error underline. */
const TYPED_TEXT = "text-[var(--ft-passage-typed,var(--primary))]";
const UNTYPED_TEXT =
  "text-[var(--ft-passage-untyped,var(--muted-foreground))]";
const ERROR_WORD =
  "text-[var(--ft-passage-error,var(--destructive))] underline decoration-1 underline-offset-[6px] decoration-[var(--ft-passage-error,var(--destructive))]";

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
  const { settings: caret } = useCaretSettings();
  // Keep the caret in view on long runs (the text box scrolls).
  const [caretEl, setCaretEl] = useState<HTMLSpanElement | null>(null);
  useEffect(() => {
    caretEl?.scrollIntoView({ block: "nearest" });
  }, [caretEl]);

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
    <div className="flex h-full min-h-0 flex-col justify-center overflow-hidden py-6">
      <div className="flex min-h-0 w-full flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground">Replay</span>
            <span aria-hidden> · </span>
            {pct}%<span aria-hidden> · </span>
            {(elapsed / 1000).toFixed(1)}s
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* Finger-sized on phones (§7 / §17.2), compact from sm. */}
            <SegmentedControl
              size="sm"
              ariaLabel="Replay speed"
              value={speed}
              onValueChange={setSpeed}
              options={SPEEDS}
              className="[&>button]:h-10 [&>button]:px-3 sm:[&>button]:h-auto sm:[&>button]:px-2.5"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              className="h-11 sm:h-8"
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              {paused ? "Play" : "Pause"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit} className="h-11 sm:h-8">
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

        <div className="min-h-0 overflow-y-auto">
          <div
            className={cn(
              "text-2xl leading-[1.9] tracking-[0.04em] sm:text-3xl",
              UNTYPED_TEXT,
            )}
            style={{
              fontFamily: "var(--ft-font-family, inherit)",
              wordSpacing: "var(--ft-word-spacing, 0.25em)",
            }}
          >
            {displayWords.map((word, wi) => (
              <span key={wi}>
                <span className="inline-block whitespace-nowrap">
                  {[...word].map((ch, ci) => {
                    const typed =
                      wi < wordIdx || (wi === wordIdx && ci < charIdx);
                    const cls = !typed
                      ? UNTYPED_TEXT
                      : errorWords.has(wi)
                        ? ERROR_WORD
                        : TYPED_TEXT;
                    const here = caret.style !== "off" && wi === wordIdx;
                    const isCursor = here && ci === charIdx;
                    // Word fully typed: park the caret after its last letter.
                    const isTrailing =
                      here && charIdx >= word.length && ci === word.length - 1;
                    return (
                      <span
                        key={ci}
                        ref={isCursor || isTrailing ? setCaretEl : undefined}
                        className={cn("relative", cls)}
                      >
                        {ch}
                        {isCursor || isTrailing ? (
                          <InlineCaret style={caret.style} trailing={isTrailing} />
                        ) : null}
                      </span>
                    );
                  })}
                </span>
                {wi < displayWords.length - 1 ? " " : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
