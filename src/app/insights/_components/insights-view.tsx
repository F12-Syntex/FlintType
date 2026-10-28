"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageSection, PageShell } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { ConfidencePlayground } from "./confidence-playground";
import { FocusNext } from "./guidance";
import { TrendPanel } from "./insights-trend";
import { InsightsSkeleton } from "./insights-skeleton";
import { TwoUp } from "./panel";
import { RecentTests } from "./recent-tests";
import { StatusPill } from "./status-pill";
import { WeakSpots } from "./weak-spots";

type LoadError = { message: string; signIn: boolean };

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
            description="Your highest-leverage practice right now."
          >
            <FocusNext snap={snap} />
          </PageSection>
          <PageSection
            id="weak-spots"
            title="Weak spots"
            description="Slowest compared with your own average."
          >
            <WeakSpots snap={snap} />
          </PageSection>
          <PageSection
            id="trend"
            title="Trend"
            description="Your last 30 completed tests."
          >
            <TwoUp>
              <TrendPanel tests={snap.recentTests} />
              <RecentTests tests={snap.recentTests} />
            </TwoUp>
          </PageSection>
          <PageSection
            id="playground"
            title="Playground"
            description="Score any text against your model."
          >
            <ConfidencePlayground cold={snap.cold} />
          </PageSection>
        </>
      )}
    </PageShell>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center">
      <p className="text-sm text-muted-foreground" role="alert">
        {error.message}
      </p>
      {error.signIn ? (
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      ) : (
        <Button variant="outline" size="lg" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
