"use client";

import { Surface } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import type { ScoreWordOutput, WeaknessBreakdown } from "@/types/adapt";
import { SeverityBar } from "./severity-bar";

function Figure({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-bold tracking-tight tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** The scored word: four headline figures (the total score is the one
 *  orange number), then the four contribution groups (δ word, α pairs,
 *  β triples, γ finger moves), each with its own severity meters. */
export function ScoreResult({ result }: { result: ScoreWordOutput }) {
  return (
    <Surface className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-1 pt-4">
        <span className="font-mono text-lg font-semibold text-foreground">
          {result.word}
        </span>
        <span
          className={cn(
            "inline-flex h-7 items-center rounded-pill px-3 text-xs font-medium",
            result.inChallengeBand
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {result.inChallengeBand ? "In your challenge band" : "Outside your challenge band"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-5 py-5 sm:grid-cols-3">
        <Figure label="Total score" value={result.total.toFixed(2)} accent />
        <Figure label="Predicted time" value={`${result.predictedMs.toFixed(0)} ms`} />
        <Figure label="Recency multiplier" value={`× ${result.recencyMultiplier.toFixed(2)}`} />
      </div>

      <div className="flex flex-col divide-y divide-border/70 border-t border-border/70">
        <BreakdownGroup
          heading="Whole word"
          symbol="δ"
          contribution={result.deltaContribution}
          rows={result.wordModel ? [result.wordModel] : []}
          emptyLabel="No whole-word timings yet. Type this word a few times to wake δ."
        />
        <BreakdownGroup
          heading="Letter pairs"
          symbol="α"
          contribution={result.alphaContribution}
          rows={result.bigrams}
          emptyLabel="Too short for any letter pairs."
        />
        <BreakdownGroup
          heading="Letter triples"
          symbol="β"
          contribution={result.betaContribution}
          rows={result.trigrams}
          emptyLabel="Too short for any letter triples."
        />
        <BreakdownGroup
          heading="Finger moves"
          symbol="γ"
          contribution={result.gammaContribution}
          rows={result.motorFeatures}
          emptyLabel="No finger moves (letters unmapped or fingers turned off)."
        />
      </div>
    </Surface>
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
    <div className="flex flex-col gap-2.5 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm font-semibold text-muted-foreground">
            {symbol}
          </span>
          <span className="text-sm font-medium text-foreground">{heading}</span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          adds{" "}
          <span className="font-medium text-foreground">{contribution.toFixed(2)}</span>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="sr-only">Pattern</th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">Time</th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">Samples</th>
              <th scope="col" className="py-1 text-right font-medium">Weakness</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.key}-${i}`}
                className="border-b border-border/50 last:border-b-0"
              >
                <td className="py-1.5 pr-3 font-mono text-foreground">{r.key}</td>
                <td className="py-1.5 pr-3 text-right text-xs text-muted-foreground">
                  {r.meanMs == null ? "no data" : `${r.meanMs.toFixed(0)} ms`}
                </td>
                <td className="py-1.5 pr-3 text-right text-xs text-muted-foreground">
                  {r.meanMs == null ? "—" : r.sampleCount.toLocaleString()}
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
                        r.weakness > 0 ? "text-foreground" : "text-muted-foreground",
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
