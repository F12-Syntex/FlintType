"use client";

import { useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { AdaptSnapshotOutput } from "@/types/adapt";
import { BiogramHeader } from "./biogram-header";
import { ModelTable } from "./model-table";
import { SectionFrame } from "./section-frame";
import {
  FingerMapView,
  OverviewBody,
  RecencyMap,
  RecentTests,
} from "./sections";
import { WordScorer } from "./word-scorer";

/** /app/biogram landing — fetches the snapshot and renders every
 *  section. Manual refresh button so the user can re-poll after
 *  taking a test in another tab without a full reload. */
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
    <>
      <BiogramHeader snap={snap} loading={loading} onRefresh={() => void load()} />

      {error ? (
        <section className="px-5 py-12 sm:px-14 sm:py-16">
          <p className="text-sm text-primary">{error}</p>
        </section>
      ) : !snap ? (
        <section className="px-5 py-12 sm:px-14 sm:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Loading snapshot…
          </p>
        </section>
      ) : (
        <SnapshotBody snap={snap} />
      )}
    </>
  );
}

function SnapshotBody({ snap }: { snap: AdaptSnapshotOutput }) {
  return (
    <>
      <SectionFrame
        id="overview"
        label="OVERVIEW"
        subtitle="State at a glance — sample volume, fatigue dampener, baseline keystroke times, and whether the model has left cold start."
      >
        <OverviewBody snap={snap} />
      </SectionFrame>

      <SectionFrame
        id="bigrams"
        label="BIGRAMS"
        subtitle="Two-character sequences. Weakness is measured against the bigram baseline."
        actions={<RowCount n={snap.bigrams.length} />}
      >
        <ModelTable
          rows={snap.bigrams}
          patternHeader="BIGRAM"
          baseline={snap.baselines.bigram}
          emptyHint="No bigram measurements yet — finish a test."
        />
      </SectionFrame>

      <SectionFrame
        id="trigrams"
        label="TRIGRAMS"
        subtitle="Three-character sequences. Slower-moving than bigrams — more samples needed before they're load-bearing."
        actions={<RowCount n={snap.trigrams.length} />}
      >
        <ModelTable
          rows={snap.trigrams}
          patternHeader="TRIGRAM"
          baseline={snap.baselines.trigram}
          emptyHint="No trigram measurements yet."
        />
      </SectionFrame>

      <SectionFrame
        id="motor-features"
        label="MOTOR FEATURES"
        subtitle="Derived from your finger map — same-finger, hand-alternation, row-jump and friends. Cleared and rebuilt whenever fingers are reconfigured."
        actions={<RowCount n={snap.motorFeatures.length} />}
      >
        <ModelTable
          rows={snap.motorFeatures}
          patternHeader="FEATURE"
          baseline={snap.baselines.motorFeature}
          emptyHint="No motor-feature measurements yet."
        />
      </SectionFrame>

      <SectionFrame
        id="recent-tests"
        label="RECENT TESTS"
        subtitle="Last few completed runs. The status dot flags a test that wasn't finished — those still feed the model where measurements are clean."
      >
        <RecentTests tests={snap.recentTests} />
      </SectionFrame>

      <SectionFrame
        id="recency-map"
        label="RECENCY MAP"
        subtitle="Words you've recently seen. Each carries a multiplier that decays back to 1.0 over the next few tests so the algorithm doesn't loop the same passage at you."
      >
        <RecencyMap rows={snap.recentlyShown} />
      </SectionFrame>

      <SectionFrame
        id="finger-map"
        label="FINGER MAP"
        subtitle="The hand layout the algorithm assumes. The hash changes whenever you move a key — invalidating every motor-feature row."
      >
        <FingerMapView
          layout={snap.handLayout}
          fingerMapHash={snap.fingerMapHash}
        />
      </SectionFrame>

      <SectionFrame
        id="word-scorer"
        label="WORD SCORER"
        subtitle="Type any word to see exactly how the algorithm scores it — α/β/γ contributions, per-pattern weakness, predicted typing time, and whether the word lands in your challenge band."
      >
        <WordScorer />
      </SectionFrame>
    </>
  );
}

function RowCount({ n }: { n: number }) {
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
      <span className="text-foreground tabular-nums">{n}</span> tracked
    </span>
  );
}
