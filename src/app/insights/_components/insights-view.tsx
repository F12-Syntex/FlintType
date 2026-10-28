"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageSection, PageShell } from "@/components/page-shell";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { ConfidencePlayground } from "./confidence-playground";
import { ErrorState, type LoadError } from "./error-state";
import { FocusNext } from "./guidance";
import { InsightsSkeleton } from "./insights-skeleton";
import { StatusPill } from "./status-pill";
import { TrendSection } from "./trend-section";
import { WeakSpots } from "./weak-spots";

/** /insights: what the algorithm knows about your typing, answer first.
 *  One `history.summary()` call feeds every section, in priority order:
 *  Focus next → Weak spots → Trend → Playground. The playground is
 *  independent and scores words through `adapt.scoreWord`. */
export function InsightsView() {
  const backend = useBackend();
  const [snap, setSnap] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (!cancelled) setSnap(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError({ message: "Sign in to see your insights.", signIn: true });
        } else if (err instanceof BackendError && err.code === "RATE_LIMITED") {
          setError({
            message: "Too many refreshes in a row. Wait a moment, then try again.",
            signIn: false,
          });
        } else {
          setError({
            message:
              err instanceof Error ? err.message : "Couldn't load your insights.",
            signIn: false,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Insights"
        title="Your typing model"
        description="What the algorithm has learned from your typing."
        aside={<StatusPill snap={snap} loading={loading} />}
      />
      {error && !snap ? (
        <ErrorState error={error} onRetry={retry} />
      ) : !snap ? (
        <InsightsSkeleton />
      ) : (
        <>
          <PageSection
            id="focus"
            title="Focus next"
            description="The drill that will help most right now."
          >
            <FocusNext snap={snap} />
          </PageSection>
          <PageSection
            id="weak-spots"
            title="Weak spots"
            description="Ranked by how reliably slow each one is."
          >
            <WeakSpots snap={snap} />
          </PageSection>
          <TrendSection tests={snap.recentTests} />
          <PageSection
            id="playground"
            title="Playground"
            description="Score any text against your model."
          >
            <ConfidencePlayground cold={snap.cold} userId={snap.subjectUserId} />
          </PageSection>
        </>
      )}
    </PageShell>
  );
}
