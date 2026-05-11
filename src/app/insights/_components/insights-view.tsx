"use client";

import { useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { ConfidencePlayground } from "./confidence-playground";
import { Guidance } from "./guidance";
import { InsightsHero } from "./insights-hero";
import { InsightsSection } from "./insights-section";
import { InsightsTrend } from "./insights-trend";
import { RecentTests } from "./recent-tests";
import { WeaknessChart } from "./weakness-chart";

/** /insights orchestrator. One backend.history.summary() call
 *  fans out to: hero status, WPM trend, slow words, slow bigrams,
 *  recent tests, practical guidance. The confidence playground is
 *  independent — it talks to /api/adapt/scoreWord per-word.
 *
 *  Replaces the old /history page; the data is the same source
 *  (recent tests + weakness lists), but the framing pivots from
 *  'audit log of the last 90 days' to 'what does the algorithm
 *  understand about your typing right now'. */
export function InsightsView() {
  const backend = useBackend();
  const [snap, setSnap] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnap(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to load your insights.");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load insights.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  return (
    <>
      <InsightsHero snap={snap} loading={loading} />

      {error ? (
        <section className="px-5 py-12 sm:px-12 lg:px-16">
          <p className="text-sm text-primary">{error}</p>
        </section>
      ) : !snap ? (
        <section className="px-5 py-12 sm:px-12 lg:px-16">
          <p className="text-sm text-muted-foreground">Reading your model…</p>
        </section>
      ) : (
        <>
          {/* Trend + recent tests share a row at lg+ — both are
           *  time-axis summaries and read together. */}
          <div className="grid gap-0 border-b border-border lg:grid-cols-[2fr_1fr]">
            <InsightsSection
              label="WPM trend"
              subtitle="Your last 30 completed tests, oldest left."
              noBorder
              className="lg:border-r lg:border-border"
            >
              <InsightsTrend tests={snap.recentTests} />
            </InsightsSection>
            <InsightsSection
              label="Recent runs"
              subtitle="Latest six. Tap into your profile for the longer list."
              noBorder
            >
              <RecentTests tests={snap.recentTests} />
            </InsightsSection>
          </div>

          {/* Weakness charts side-by-side at lg+ — words on the
           *  left, bigrams on the right. Both read the same summary
           *  payload; the chart primitive is shared. */}
          <div className="grid gap-0 border-b border-border lg:grid-cols-2">
            <InsightsSection
              label="Slowest words"
              subtitle="Whole-word slowness vs your own baseline. Drill these in the Worst-words burst."
              noBorder
              className="lg:border-r lg:border-border"
            >
              <WeaknessChart
                rows={snap.weakestWords}
                emptyHint="No word baseline yet — finish a few more tests."
                baselineMs={snap.wordBaselineMs}
              />
            </InsightsSection>
            <InsightsSection
              label="Slowest bigrams"
              subtitle="Two-character clusters that drag your hands. The Weakness gauntlet drill turns these into a sudden-death passage."
              noBorder
            >
              <WeaknessChart
                rows={snap.weakestPairs}
                emptyHint="No bigram baseline yet — type a bit more and the model will surface your weak pairs."
                baselineMs={snap.bigramBaselineMs}
              />
            </InsightsSection>
          </div>

          <InsightsSection
            label="Coaching · what to focus on next"
            subtitle="Plain-language guidance derived from your model — what's actually slow, what to drill."
          >
            <Guidance snap={snap} />
          </InsightsSection>

          <InsightsSection
            label="Confidence playground"
            subtitle="Type or paste any text. The algorithm scores every word against your model and paints challenge-band words in primary."
            noBorder
          >
            <ConfidencePlayground />
          </InsightsSection>
        </>
      )}
    </>
  );
}
