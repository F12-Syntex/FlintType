"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { ScoreWordOutput } from "@/types/adapt";

const SAMPLE = "the quick brown fox jumps over the lazy dog";

/** Confidence playground, paste any text, see what the algorithm
 *  thinks of it. For each word we hit /api/adapt/scoreWord and
 *  display the predicted WPM (derived from predictedMs) and a
 *  challenge-band tag. The text itself paints per-word with colour
 *  intensity scaled to predicted slowness. */
export function ConfidencePlayground() {
  const backend = useBackend();
  const [input, setInput] = useState(SAMPLE);
  const [scores, setScores] = useState<Record<string, ScoreWordOutput>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tokenise input on every render, the actual scoring waits for
  // the user to settle (debounced effect below).
  const words = useMemo(
    () =>
      input
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z']/g, "").toLowerCase())
        .filter((w) => w.length > 0)
        .slice(0, 30),
    [input],
  );

  const scoreWords = useCallback(
    async (toScore: readonly string[]) => {
      const missing = toScore.filter((w) => scores[w] == null);
      if (missing.length === 0) return;
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          missing.map((w) =>
            backend.adapt.scoreWord({ word: w }).then(
              (r) => [w, r] as const,
              (err) => {
                throw err instanceof Error ? err : new Error(String(err));
              },
            ),
          ),
        );
        setScores((prev) => {
          const next = { ...prev };
          for (const [w, r] of results) next[w] = r;
          return next;
        });
      } catch (err) {
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to score words against your model.");
        } else {
          setError(
            err instanceof Error ? err.message : "Scoring failed.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [backend, scores],
  );

  // Debounce the typing → scoring loop. 350 ms is fast enough for
  // the user to feel reactive without spamming the backend on every
  // keystroke.
  useEffect(() => {
    if (words.length === 0) return;
    const id = setTimeout(() => void scoreWords(words), 350);
    return () => clearTimeout(id);
  }, [words, scoreWords]);

  const summary = useMemo(() => buildSummary(words, scores), [words, scores]);

  return (
    <div className="flex flex-col gap-5">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste any text…"
        className="font-mono text-sm"
        autoComplete="off"
        spellCheck={false}
      />

      {error ? (
        <p className="text-sm text-primary" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>
          <span className="text-foreground tabular-nums">
            {summary.scored}
          </span>{" "}
          / {words.length} scored
        </span>
        <span>
          Predicted{" "}
          <span className="text-foreground tabular-nums">
            {Math.round(summary.predictedWpm)}
          </span>{" "}
          wpm
        </span>
        <span>
          <span className="text-primary tabular-nums">
            {summary.inChallengeBand}
          </span>{" "}
          challenge words
        </span>
        {loading ? <span className="text-primary">Scoring…</span> : null}
      </div>

      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-card/40 px-4 py-4 font-mono text-base leading-relaxed">
        {words.length === 0 ? (
          <span className="text-muted-foreground">
            Awaiting input.
          </span>
        ) : (
          words.map((w, i) => <WordChip key={`${w}-${i}`} word={w} score={scores[w]} />)
        )}
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Colour intensity scales with predicted slowness. The darker
        primary tint means the algorithm thinks you&apos;ll stall on
        that word. Hover for the per-word breakdown.
      </p>
    </div>
  );
}

function WordChip({
  word,
  score,
}: {
  word: string;
  score: ScoreWordOutput | undefined;
}) {
  if (!score) {
    return (
      <span className="rounded-sm bg-foreground/[0.04] px-1.5 py-0.5 text-muted-foreground/70">
        {word}
      </span>
    );
  }
  // Predicted WPM from predicted-ms-per-keystroke. Length-aware:
  // wpm = (chars / 5) / (totalMs / 60_000)
  // For a single word: chars = word.length, totalMs = predictedMs * length.
  // → wpm = 12_000 / predictedMs
  const predictedWpm =
    score.predictedMs > 0 ? 12_000 / score.predictedMs : 0;
  // Colour intensity: low predicted WPM = darker primary. Map
  // 30..120 wpm → 1..0 ratio.
  const ratio = Math.max(
    0,
    Math.min(1, 1 - (predictedWpm - 30) / 90),
  );
  const bg = `color-mix(in oklch, var(--primary) ${Math.round(
    ratio * 35 + 6,
  )}%, transparent)`;
  const fg =
    ratio > 0.55
      ? "var(--primary)"
      : "var(--foreground)";
  return (
    <span
      title={`${word} · ~${Math.round(predictedWpm)} wpm · ${
        score.inChallengeBand ? "challenge band" : "comfortable"
      }`}
      className={cn(
        "rounded-sm px-1.5 py-0.5 transition-colors",
        score.inChallengeBand && "ring-1 ring-primary/40",
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {word}
    </span>
  );
}

function buildSummary(
  words: readonly string[],
  scores: Record<string, ScoreWordOutput>,
) {
  let totalMs = 0;
  let totalChars = 0;
  let scored = 0;
  let inChallengeBand = 0;
  for (const w of words) {
    const s = scores[w];
    if (!s) continue;
    scored += 1;
    totalMs += s.predictedMs * w.length;
    totalChars += w.length;
    if (s.inChallengeBand) inChallengeBand += 1;
  }
  const predictedWpm =
    totalMs > 0 ? (totalChars / 5) / (totalMs / 60_000) : 0;
  return { scored, predictedWpm, inChallengeBand };
}
