"use client";

import { useState } from "react";
import { LearningSteps } from "@/components/analysis/learning-steps";
import { PageHeader, PageSection, PageShell, Surface } from "@/components/page-shell";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { BucketPicker } from "./bucket-picker";
import { testKindOf } from "./copy-phrases";
import { EmptyState } from "./empty-state";
import { ErrorState, SwitchError } from "./error-state";
import { HabitsSection } from "./habits-section";
import { HelpAndChanges } from "./help-and-changes";
import { headerDescription, LEARNING_TITLE, learningSteps, PAGE_TITLE, READY_TESTS } from "./insights-copy";
import { InsightsFooter } from "./insights-footer";
import { LOADING_LABEL } from "./labels-copy";
import { InsightsSkeleton } from "./insights-skeleton";
import { PlaygroundSection } from "./playground-section";
import { PracticeSection } from "./practice-section";
import { TimeSection } from "./time-section";
import { TrendSection } from "./trend-section";
import { useInsights } from "./use-insights";
import { VerdictCard } from "./verdict-card";

/** /insights (spec-40): how you type, answered from your own tests.
 *  One `insights.overview` call feeds every section except the
 *  playground, in the order of the questions people ask: how am I
 *  doing, what should I do, why, is it working, where exactly, and
 *  what else is true about me. */
export function InsightsView() {
  const { data, pickerKey, failedKey, error, loading, switching, select, retry, refresh } = useInsights();
  const { prefs } = useAppearancePrefs();
  const unit = prefs.typingSpeedUnit;
  const [nowMs] = useState(() => Date.now());
  const kind = testKindOf(data?.bucket ?? null);

  const header = (
    <PageHeader
      title={PAGE_TITLE}
      description={data ? headerDescription({ status: data.status, tests: data.progress.tests, kind }) : undefined}
      aside={
        data?.bucket && data.buckets.length >= 2 ? (
          <BucketPicker
            buckets={data.buckets}
            // The picker follows a pick at once; the content below catches
            // up when its overview lands. A failed switch goes back.
            current={data.buckets.find((b) => b.key === pickerKey) ?? data.bucket}
            onSelect={select}
          />
        ) : null
      }
    />
  );

  if (loading) {
    return (
      <PageShell>
        {header}
        <InsightsSkeleton />
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell>
        {header}
        {error ? <ErrorState error={error} onRetry={retry} /> : null}
      </PageShell>
    );
  }
  if (data.status === "empty" || !data.headline) {
    return (
      <PageShell>
        {header}
        <EmptyState progress={data.progress} />
      </PageShell>
    );
  }

  const learning = data.progress.tests < READY_TESTS;
  return (
    <PageShell>
      {header}
      {error ? (
        <SwitchError
          error={error}
          kind={testKindOf(data.buckets.find((b) => b.key === failedKey) ?? data.bucket)}
          onRetry={retry}
        />
      ) : null}
      <p className="sr-only" role="status">
        {switching ? LOADING_LABEL : ""}
      </p>
      <div
        aria-busy={switching}
        className={cn(
          "flex flex-col gap-10 transition-opacity duration-200 motion-reduce:transition-none sm:gap-12",
          switching && "opacity-60",
        )}
      >
        <VerdictCard
          headline={data.headline}
          nextStep={data.nextStep}
          analysed={data.barriers.status !== "not-ready"}
          tests={data.progress.tests}
          kind={kind}
          unit={unit}
          nowMs={nowMs}
        />
        <TimeSection time={data.time} kind={kind} unit={unit} usual={data.headline.usual} />
        {learning ? (
          <PageSection id="learning" title={LEARNING_TITLE}>
            <Surface className="p-4 sm:p-5">
              <LearningSteps steps={learningSteps(data.progress, kind)} />
            </Surface>
          </PageSection>
        ) : (
          <>
            <HelpAndChanges
              barriers={data.barriers}
              changes={data.changes}
              nextStep={data.nextStep}
              kind={kind}
              unit={unit}
            />
            <PracticeSection practice={data.practice} />
          </>
        )}
        <TrendSection
          // Keyed by bucket, so the range's default follows each bucket.
          key={data.bucket?.key ?? ""}
          series={data.series}
          headline={data.headline}
          tests={data.progress.tests}
          unit={unit}
        />
        {!learning && data.habits ? (
          <HabitsSection habits={data.habits} unit={unit} bucket={data.bucket} usualWpm={data.headline.usual} />
        ) : null}
        <PlaygroundSection cold={data.cold} />
        <InsightsFooter onDeleted={refresh} />
      </div>
    </PageShell>
  );
}
