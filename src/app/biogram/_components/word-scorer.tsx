"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";
import type { ScoreWordOutput } from "@/types/adapt";
import { ScoreResult } from "./score-result";

/** Interactive section: type a word, see how the algorithm scores it.
 *  Hits adapt.scoreWord on the server so the breakdown comes from the
 *  same code path the selection uses. */
export function WordScorer() {
  const backend = useBackend();
  const [word, setWord] = useState("");
  const [result, setResult] = useState<ScoreWordOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function score(input: string) {
    const trimmed = input.trim().toLowerCase();
    if (trimmed.length === 0) return;
    setLoading(true);
    setError("");
    try {
      setResult(await backend.adapt.scoreWord({ word: trimmed }));
    } catch (err) {
      setError(err instanceof BackendError ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void score(word);
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <Input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Type a word, e.g. typing"
          maxLength={50}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Word to score"
          className="h-11 font-mono sm:max-w-sm"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading || word.trim().length === 0}
          className="w-full sm:w-auto"
        >
          {loading ? "Scoring…" : "Score word"}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? <ScoreResult result={result} /> : <ScorerHint />}
    </div>
  );
}

function ScorerHint() {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-5 text-sm leading-relaxed text-muted-foreground">
      A word&apos;s score adds up its letter pairs, letter triples, finger
      moves and, once you&apos;ve typed it a few times, the whole word
      itself, which counts the most. A lower predicted time means the model
      already trusts your hands on it.
    </p>
  );
}
