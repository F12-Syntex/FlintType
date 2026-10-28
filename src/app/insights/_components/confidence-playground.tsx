"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/page-shell";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import {
  type Scored,
  summarisePlayground,
  tokenisePlayground,
} from "./playground-math";
import { createScoreCache, sessionScoreStorage } from "./score-cache";
import { SummaryRow } from "./summary-row";
import { WordChip } from "./word-chip";

const SAMPLE = "the quick brown fox jumps over the lazy dog";

/** Shared across mounts (and, via sessionStorage, reloads) so a revisit
 *  doesn't re-spend the per-user scoring budget on known words. */
const scoreCache = createScoreCache<Scored>({
  storage: sessionScoreStorage("ft:insights:scores:"),
});

function errorMessage(err: unknown): string {
  if (err instanceof BackendError) {
    if (err.code === "UNAUTHORIZED") return "Sign in to score words against your model.";
    if (err.code === "RATE_LIMITED") return "That's a lot of new words at once. Wait a minute, then keep typing.";
  }
  return err instanceof Error ? err.message : "Scoring failed.";
}

/** Type any text and see how the model predicts you'll type it: each
 *  word shows its predicted WPM, and only words worth practising are
 *  tinted orange. Scores come from `adapt.scoreWord`, one request per
 *  new word, debounced, cached and de-duplicated while in flight. */
export function ConfidencePlayground({
  cold,
  userId,
}: {
  cold: boolean;
  userId: string;
}) {
  const backend = useBackend();
  const [input, setInput] = useState(SAMPLE);
  const [fetched, setFetched] = useState<Record<string, Scored>>({});
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Words that just failed (e.g. rate-limited) wait for the next edit
  // instead of retrying on every re-render.
  const failed = useRef(new Set<string>());

  const words = useMemo(() => tokenisePlayground(input), [input]);
  // The server marks every word "in band" when the model is cold, so
  // the band only means something once the model is warm.
  const bandActive = !cold;

  // This session's results plus anything already cached, so known words
  // paint immediately with no request.
  const scores = useMemo(() => {
    const out: Record<string, Scored> = { ...fetched };
    for (const w of words) {
      if (out[w]) continue;
      const hit = scoreCache.peek(userId, w);
      if (hit) out[w] = hit;
    }
    return out;
  }, [words, fetched, userId]);

  // Debounce typing → scoring so a burst of keystrokes is one request
  // per new word, not one per keystroke.
  useEffect(() => {
    const missing = [...new Set(words)].filter(
      (w) => scores[w] == null && !failed.current.has(w),
    );
    if (missing.length === 0) return;
    const id = setTimeout(async () => {
      setInFlight((n) => n + 1);
      setError(null);
      const settled = await Promise.allSettled(
        missing.map((w) =>
          scoreCache.load(userId, w, async () => {
            const r = await backend.adapt.scoreWord({ word: w });
            return { predictedMs: r.predictedMs, inChallengeBand: r.inChallengeBand };
          }),
        ),
      );
      const next: Record<string, Scored> = {};
      let firstError: unknown = null;
      settled.forEach((r, i) => {
        const w = missing[i]!;
        if (r.status === "fulfilled") next[w] = r.value;
        else {
          failed.current.add(w);
          firstError ??= r.reason;
        }
      });
      if (Object.keys(next).length > 0) {
        setFetched((prev) => ({ ...prev, ...next }));
      }
      if (firstError) setError(errorMessage(firstError));
      setInFlight((n) => n - 1);
    }, 350);
    return () => clearTimeout(id);
  }, [words, scores, userId, backend]);

  const summary = useMemo(
    () => summarisePlayground(words, scores, bandActive),
    [words, scores, bandActive],
  );

  return (
    <Surface className="flex flex-col gap-4 p-4 sm:p-5">
      <Input
        value={input}
        onChange={(e) => {
          failed.current.clear();
          setInput(e.target.value);
        }}
        placeholder="Type or paste any text"
        aria-label="Text to score against your model"
        className="font-mono"
        autoComplete="off"
        spellCheck={false}
      />

      {words.length > 0 ? (
        <SummaryRow
          summary={summary}
          total={words.length}
          bandActive={bandActive}
          busy={inFlight > 0}
        />
      ) : null}

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
          ? "Numbers are each word's predicted WPM. Orange words are worth practising: a bit slower than your average, not so slow you stall."
          : "Numbers are each word's predicted WPM. Words worth practising light up once your model knows you better."}
      </p>
    </Surface>
  );
}
