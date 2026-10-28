"use client";

import { useEffect, useState } from "react";
import { PageSection, PageShell, Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { BackendError, useBackend } from "@/lib/backend";
import type { AdaptSnapshotOutput } from "@/types/adapt";
import { BiogramHeader } from "./biogram-header";
import { PatternModels } from "./pattern-models";
import { OverviewBody } from "./overview";
import { FingerMapView } from "./finger-map";
import { RecencyMap, RecentTests } from "./sections";
import { WordScorer } from "./word-scorer";

/** /biogram — fetches the adapt snapshot and renders every section.
 *  Manual refresh so the user can re-poll after taking a test in
 *  another tab without a full reload. */
export function BiogramView() {
  const backend = useBackend();
  const [snap, setSnap] = useState<AdaptSnapshotOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setSnap(await backend.adapt.snapshot());
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setError("Sign in to view your algorithm state.");
      } else {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <BiogramHeader snap={snap} loading={loading} onRefresh={() => void load()} />

      {error ? (
        <Surface className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </Surface>
      ) : !snap ? (
        <LoadingSkeleton />
      ) : (
        <SnapshotBody snap={snap} />
      )}
    </PageShell>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading snapshot">
      <span className="h-4 w-28 rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-24 rounded-2xl bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function SnapshotBody({ snap }: { snap: AdaptSnapshotOutput }) {
  return (
    <>
      <PageSection
        id="overview"
        title="Overview"
        description="How much the model has seen, and how it's tuned right now."
      >
        <OverviewBody snap={snap} />
      </PageSection>

      <PageSection
        id="patterns"
        title="Patterns"
        description="Every sequence the model tracks. Weakness is how reliably slower you are on it than your usual pace."
      >
        <PatternModels snap={snap} />
      </PageSection>

      <PageSection
        id="word-scorer"
        title="Word scorer"
        description="Type any word to see exactly how it would be scored for your next test."
      >
        <WordScorer />
      </PageSection>

      <PageSection
        id="recent-tests"
        title="Recent tests"
        description="Your last few runs. Unfinished ones still teach the model where the timing is clean."
      >
        <RecentTests tests={snap.recentTests} />
      </PageSection>

      <PageSection
        id="recency-map"
        title="Recently shown words"
        description="Words you've just seen are held back for a few tests so the same passage doesn't loop. The number is how many tests ago each one appeared."
      >
        <RecencyMap rows={snap.recentlyShown} />
      </PageSection>

      <PageSection
        id="finger-map"
        title="Finger map"
        description="The hand layout the model assumes. Moving a key resets the finger-movement model."
      >
        <FingerMapView
          layout={snap.handLayout}
          fingerMapHash={snap.fingerMapHash}
        />
      </PageSection>
    </>
  );
}
