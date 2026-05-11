"use client";

import { useState } from "react";
import { Stat, Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { ScoreWordOutput, WeaknessBreakdown } from "@/types/adapt";
import { SeverityBar } from "./severity-bar";

/** Interactive section: type a word, see how the algorithm scores it.
 *  Hits adapt.scoreWord on the server so the breakdown comes from the
 *  same code path the selection uses. The result panel paints a
 *  hero-strip of four headline metrics, then three contribution
 *  groups (α/β/γ) — each with its own severity meters. */
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
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void score(word);
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Word
          </span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. typing"
            maxLength={50}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Word to score"
            className={cn(
              "h-11 w-full rounded-md border border-foreground/10 bg-background pl-[68px] pr-3",
              "font-mono text-sm tabular-nums text-foreground outline-none",
              "placeholder:text-muted-foreground/60",
              "transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
              "focus-visible:border-primary",
            )}
          />
        </div>
        <button
          type="submit"
          disabled={loading || word.trim().length === 0}
          className={cn(
            "h-11 rounded-md border px-5 font-mono text-[11px] font-medium uppercase tracking-[0.18em]",
            "transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
            "border-primary bg-primary text-primary-foreground",
            "hover:bg-primary/90 disabled:cursor-not-allowed disabled:border-foreground/15 disabled:bg-transparent disabled:text-muted-foreground",
            loading && "cursor-wait",
          )}
        >
          {loading ? "Scoring…" : "Score word"}
        </button>
      </form>

      {error ? <p className="text-sm text-primary">{error}</p> : null}

      {result ? <ResultPanel result={result} /> : <ScorerHint />}
    </div>
  );
}

function ScorerHint() {
  return (
    <div className="rounded-md border border-dashed border-foreground/10 bg-card/40 px-5 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Awaiting input
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The score is{" "}
        <span className="text-foreground">
          α·bigrams + β·trigrams + γ·motor + δ·word
        </span>
        , optionally damped by recency. δ carries the highest weight
        because the whole-word measurement is the most authoritative
        signal we have once the user has typed it a few times. Lower
        predicted ms means the model already trusts your hands on
        this word.
      </p>
    </div>
  );
}

function ResultPanel({ result }: { result: ScoreWordOutput }) {
  return (
    <div className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 bg-card/40">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <Tag tone="ember">RESULT</Tag>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {result.word}
          </span>
        </div>
        <Tag>
          {result.inChallengeBand ? "IN CHALLENGE BAND" : "OUTSIDE BAND"}
        </Tag>
      </div>

      <div className="grid grid-cols-2 gap-y-5 px-5 py-5 sm:grid-cols-4 sm:divide-x sm:divide-foreground/10">
        <Stat
          label="TOTAL SCORE"
          value={result.total.toFixed(2)}
          size="lg"
          accent
          className="sm:pr-4"
        />
        <Stat
          label="PREDICTED"
          value={result.predictedMs.toFixed(0)}
          suffix=" ms"
          size="lg"
          className="sm:px-4"
        />
        <Stat
          label="RECENCY MULT"
          value={result.recencyMultiplier.toFixed(2)}
          size="lg"
          className="sm:px-4"
        />
        <Stat
          label="CHALLENGE BAND"
          value={result.inChallengeBand ? "Yes" : "No"}
          size="lg"
          accent={result.inChallengeBand}
          className="sm:pl-4"
        />
      </div>

      <div className="flex flex-col divide-y divide-foreground/10">
        <BreakdownGroup
          heading="WORD"
          symbol="δ"
          contribution={result.deltaContribution}
          rows={result.wordModel ? [result.wordModel] : []}
          emptyLabel="no whole-word measurements yet — drill this word a few times to wake δ"
        />
        <BreakdownGroup
          heading="BIGRAMS"
          symbol="α"
          contribution={result.alphaContribution}
          rows={result.bigrams}
          emptyLabel="word too short for any bigrams"
        />
        <BreakdownGroup
          heading="TRIGRAMS"
          symbol="β"
          contribution={result.betaContribution}
          rows={result.trigrams}
          emptyLabel="word too short for any trigrams"
        />
        <BreakdownGroup
          heading="MOTOR FEATURES"
          symbol="γ"
          contribution={result.gammaContribution}
          rows={result.motorFeatures}
          emptyLabel="no motor features (chars unmapped or fingers disabled)"
        />
      </div>
    </div>
  );
}

function BreakdownGroup({
  heading,
  symbol,
  contribution,
  rows,
  emptyLabel,
}: {
  heading: string;
  symbol: string;
  contribution: number;
  rows: readonly WeaknessBreakdown[];
  emptyLabel: string;
}) {
  const maxWeakness = rows.reduce((m, r) => Math.max(m, r.weakness), 0);
  return (
    <div className="flex flex-col gap-3 px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base font-semibold text-primary">
            {symbol}
          </span>
          <Tag>{heading}</Tag>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          contribution{" "}
          <span className="text-foreground">{contribution.toFixed(2)}</span>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <table className="w-full font-mono text-xs tabular-nums">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.key}-${i}`}
                className="border-b border-foreground/5 last:border-b-0"
              >
                <td className="py-1.5 pr-3 text-foreground">{r.key}</td>
                <td className="py-1.5 pr-3 text-right text-muted-foreground">
                  {r.meanMs == null
                    ? "no data"
                    : `${r.meanMs.toFixed(0)} ms · n=${r.sampleCount}`}
                </td>
                <td className="py-1.5 text-right">
                  <span className="flex items-center justify-end gap-2">
                    {r.weakness > 0 ? (
                      <SeverityBar
                        value={r.weakness}
                        max={maxWeakness}
                        width="w-10 sm:w-14"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "min-w-[2.5ch]",
                        r.weakness > 0 ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {r.weakness > 0 ? r.weakness.toFixed(2) : "—"}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
