"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Surface } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import type { ScoreWordOutput } from "@/types/adapt";
import { summarisePlayground, tokenisePlayground } from "./playground-math";
import { WordChip } from "./word-chip";

const SAMPLE = "the quick brown fox jumps over the lazy dog";

function errorMessage(err: unknown): string {
  if (err instanceof BackendError) {
    if (err.code === "UNAUTHORIZED") return "Sign in to score words against your model.";
    if (err.code === "RATE_LIMITED") return "That's a lot of new words at once. Wait a minute, then keep typing.";
  }
  return err instanceof Error ? err.message : "Scoring failed.";
}

/** Type any text and see how the model predicts you'll type it: each
 *  word shows its predicted WPM, and only challenge-band words (slow
 *  enough to be worth practising) are tinted orange. Scores come from
 *  `adapt.scoreWord`, one request per new word, debounced. */
export function ConfidencePlayground({ cold }: { cold: boolean }) {
  const backend = useBackend();
  const [input, setInput] = useState(SAMPLE);
  const [scores, setScores] = useState<Record<string, ScoreWordOutput>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(() => tokenisePlayground(input), [input]);
  // The server marks every word "in band" when the model is cold, so
  // the band only means something once the model is warm.
  const bandActive = !cold;

  const scoreWords = useCallback(
    async (toScore: readonly string[]) => {
      const missing = [...new Set(toScore)].filter((w) => scores[w] == null);
      if (missing.length === 0) return;
      setLoading(true);
      setError(null);
      const settled = await Promise.allSettled(
        missing.map((w) => backend.adapt.scoreWord({ word: w })),
      );
      const next: Record<string, ScoreWordOutput> = {};
      let firstError: unknown = null;
      settled.forEach((r, i) => {
        if (r.status === "fulfilled") next[missing[i]!] = r.value;
        else firstError ??= r.reason;
      });
      if (Object.keys(next).length > 0) {
        setScores((prev) => ({ ...prev, ...next }));
      }
      if (firstError) setError(errorMessage(firstError));
      setLoading(false);
    },
    [backend, scores],
  );

  // Debounce typing → scoring so a burst of keystrokes is one request
  // per new word, not one per keystroke.
  useEffect(() => {
    if (words.length === 0) return;
    const id = setTimeout(() => void scoreWords(words), 350);
    return () => clearTimeout(id);
  }, [words, scoreWords]);

  const summary = useMemo(
    () => summarisePlayground(words, scores, bandActive),
    [words, scores, bandActive],
  );

  return (
    <Surface className="flex flex-col gap-4 p-4 sm:p-5">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste any text"
        aria-label="Text to score against your model"
        className="font-mono text-sm"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
        <span>
          Predicted{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {summary.predictedWpm != null ? Math.round(summary.predictedWpm) : "–"}
          </span>{" "}
          wpm
        </span>
        {bandActive ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-full bg-primary/70" />
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {summary.challenge}
              </span>{" "}
              {summary.challenge === 1 ? "challenge word" : "challenge words"}
            </span>
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          {loading ? (
            <Loader2 aria-hidden className="size-3.5 motion-safe:animate-spin" />
          ) : null}
          {summary.scored} of {words.length} scored
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" aria-live="polite">
        {words.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Type something above to score it.
          </span>
        ) : (
          words.map((w, i) => (
            <WordChip
              key={`${w}-${i}`}
              word={w}
              score={scores[w]}
              bandActive={bandActive}
            />
          ))
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {bandActive
          ? "Numbers are predicted WPM per word. Orange words sit in your challenge band: slow enough to be worth practising, not so slow you stall."
          : "Numbers are predicted WPM per word. Challenge words light up once your model is warm."}
      </p>
    </Surface>
  );
}
