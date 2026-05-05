"use client";

import { useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { ScoreWordOutput, WeaknessBreakdown } from "@/types/adapt";
import { cn } from "@/lib/utils";

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
      const r = await backend.adapt.scoreWord({ word: trimmed });
      setResult(r);
    } catch (err) {
      if (err instanceof BackendError) setError(err.message);
      else setError("Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void score(word);
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="enter a word — e.g. typing"
          maxLength={50}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-9 flex-1 rounded-md border border-foreground/10 bg-background px-3 font-mono text-sm tabular-nums text-ft-ink outline-none placeholder:text-ft-dim focus-visible:border-ft-ember"
        />
        <button
          type="submit"
          disabled={loading || word.trim().length === 0}
          className={cn(
            "h-9 rounded-md border border-foreground/10 px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-ft-ink transition-colors hover:bg-ft-ember hover:text-ft-paper disabled:opacity-40",
            loading && "cursor-wait",
          )}
        >
          {loading ? "Scoring…" : "Score"}
        </button>
      </form>

      {error && <p className="text-sm text-ft-ember">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-md border border-ft-line-soft p-4 sm:p-5">
          <ScoreSummary result={result} />
          <BreakdownGroup
            heading="BIGRAMS · α"
            contribution={result.alphaContribution}
            rows={result.bigrams}
            emptyLabel="word too short for any bigrams"
          />
          <BreakdownGroup
            heading="TRIGRAMS · β"
            contribution={result.betaContribution}
            rows={result.trigrams}
            emptyLabel="word too short for any trigrams"
          />
          <BreakdownGroup
            heading="MOTOR FEATURES · γ"
            contribution={result.gammaContribution}
            rows={result.motorFeatures}
            emptyLabel="no motor features (chars unmapped or fingers disabled)"
          />
        </div>
      )}
    </div>
  );
}

function ScoreSummary({ result }: { result: ScoreWordOutput }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Stat label="TOTAL SCORE" value={result.total.toFixed(2)} accent />
      <Stat label="PREDICTED MS" value={result.predictedMs.toFixed(0)} />
      <Stat
        label="RECENCY MULT"
        value={result.recencyMultiplier.toFixed(2)}
      />
      <Stat
        label="CHALLENGE BAND"
        value={result.inChallengeBand ? "yes" : "no"}
        accent={!result.inChallengeBand}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.14em] text-ft-dim">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          accent ? "text-ft-ember" : "text-ft-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function BreakdownGroup({
  heading,
  contribution,
  rows,
  emptyLabel,
}: {
  heading: string;
  contribution: number;
  rows: readonly WeaknessBreakdown[];
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between border-b border-ft-line-soft pb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-ft-dim">
          {heading}
        </span>
        <span className="font-mono text-xs tabular-nums text-ft-ink">
          contribution {contribution.toFixed(2)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-ft-dim">{emptyLabel}</p>
      ) : (
        <table className="w-full font-mono text-xs tabular-nums">
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.key}-${i}`}
                className="border-b border-ft-line-soft/40 last:border-b-0"
              >
                <td className="py-1.5 pr-3 text-ft-ink">{r.key}</td>
                <td className="py-1.5 pr-3 text-right text-ft-dim">
                  {r.meanMs == null
                    ? "no data"
                    : `${r.meanMs.toFixed(0)} ms · n=${r.sampleCount}`}
                </td>
                <td
                  className={cn(
                    "py-1.5 text-right",
                    r.weakness > 0 ? "text-ft-ember" : "text-ft-dim",
                  )}
                >
                  {r.weakness > 0 ? r.weakness.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
