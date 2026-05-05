"use client";

import { useEffect, useState } from "react";
import { Stat, Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import {
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  type FingerId,
  type HandLayoutPrefs,
} from "@/lib/hand-layout";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput } from "@/types/adapt";
import { ModelTable } from "./model-table";
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
      <header className="border-b border-ft-line-soft px-5 pt-7 pb-6 sm:px-14">
        <div className="mb-3.5 flex items-center gap-3.5">
          <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
          <Tag>BIOGRAM · ALGORITHM STATE</Tag>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            What the adapt loop knows about you
          </h1>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-[11px] uppercase tracking-[0.16em] text-ft-dim transition-colors hover:text-ft-ember disabled:opacity-40"
          >
            {loading ? "REFRESHING…" : "REFRESH"}
          </button>
        </div>
      </header>

      {error ? (
        <section className="px-5 py-7 sm:px-14">
          <p className="text-sm text-ft-ember">{error}</p>
        </section>
      ) : !snap ? (
        <section className="px-5 py-7 sm:px-14">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ft-dim">
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
      <Section label="OVERVIEW">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat
            label="STATUS"
            value={snap.cold ? "COLD" : "WARM"}
            accent={!snap.cold}
          />
          <Stat label="BIGRAM SAMPLES" value={String(snap.totalBigramSamples)} />
          <Stat
            label="FATIGUE × WEAKNESS"
            value={snap.fatigueDampener.toFixed(2)}
            accent={snap.fatigueDampener < 1}
          />
          <Stat
            label="PATTERNS TRACKED"
            value={String(
              snap.bigrams.length +
                snap.trigrams.length +
                snap.motorFeatures.length,
            )}
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Stat
            label="BIGRAM BASELINE"
            value={`${snap.baselines.bigram.toFixed(0)} ms`}
          />
          <Stat
            label="TRIGRAM BASELINE"
            value={`${snap.baselines.trigram.toFixed(0)} ms`}
          />
          <Stat
            label="MOTOR FEATURE BASELINE"
            value={`${snap.baselines.motorFeature.toFixed(0)} ms`}
          />
        </div>
        {snap.cold && (
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ft-dim-2">
            The model needs ~200 bigram samples before it leaves cold start
            and begins biasing word selection. Until then, every passage is
            a uniform-random draw from the standard pool.
          </p>
        )}
      </Section>

      <Section label="BIGRAMS">
        <ModelTable
          rows={snap.bigrams}
          patternHeader="BIGRAM"
          baseline={snap.baselines.bigram}
          emptyHint="No bigram measurements yet — finish a test."
        />
      </Section>

      <Section label="TRIGRAMS">
        <ModelTable
          rows={snap.trigrams}
          patternHeader="TRIGRAM"
          baseline={snap.baselines.trigram}
          emptyHint="No trigram measurements yet."
        />
      </Section>

      <Section label="MOTOR FEATURES">
        <p className="mb-3 max-w-2xl text-[11px] text-ft-dim">
          Derived from your finger map. Cleared and rebuilt whenever you
          reconfigure fingers — the underlying meaning depends on which key
          belongs to which finger.
        </p>
        <ModelTable
          rows={snap.motorFeatures}
          patternHeader="FEATURE"
          baseline={snap.baselines.motorFeature}
          emptyHint="No motor-feature measurements yet."
        />
      </Section>

      <Section label="RECENT TESTS">
        {snap.recentTests.length === 0 ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-ft-dim">
            No completed tests on record.
          </p>
        ) : (
          <RecentTestsTable tests={snap.recentTests} />
        )}
      </Section>

      <Section label="RECENCY MAP">
        <p className="mb-3 max-w-2xl text-[11px] text-ft-dim">
          Words you've recently seen. Each one has its score multiplied by
          a low factor that decays back to 1.0 over the next few tests so
          the algorithm doesn't loop the same passage at you.
        </p>
        {snap.recentlyShown.length === 0 ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-ft-dim">
            Nothing in the recency map yet.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {snap.recentlyShown.map((r) => (
              <li
                key={r.word}
                className="inline-flex items-center gap-1.5 rounded-md border border-ft-line-soft bg-ft-paper-soft/50 px-2 py-1 font-mono text-xs tabular-nums"
              >
                <span className="text-ft-ink">{r.word}</span>
                <span className="text-ft-dim">·{r.testsAgo}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="FINGER MAP">
        <FingerMapView layout={snap.handLayout} fingerMapHash={snap.fingerMapHash} />
      </Section>

      <Section label="WORD SCORER">
        <p className="mb-4 max-w-2xl text-[11px] text-ft-dim">
          Type any word to see exactly how the algorithm scores it — α/β/γ
          contributions, per-pattern weakness, predicted typing time, and
          whether the word lands in your challenge band.
        </p>
        <WordScorer />
      </Section>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-ft-line-soft px-5 py-7 sm:px-14">
      <Tag>{label}</Tag>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RecentTestsTable({
  tests,
}: {
  tests: AdaptSnapshotOutput["recentTests"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs tabular-nums">
        <thead>
          <tr className="border-b border-ft-line-soft text-left text-[10px] font-medium uppercase tracking-[0.14em] text-ft-dim">
            <th className="py-2 pr-3">WHEN</th>
            <th className="py-2 pr-3">MODE</th>
            <th className="py-2 pr-3 text-right">WPM</th>
            <th className="py-2 pr-3 text-right">ACC</th>
            <th className="py-2 pr-3 text-right">ERRORS</th>
            <th className="py-2 pr-3">FINISHED</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr
              key={t.id}
              className="border-b border-ft-line-soft/60 last:border-b-0"
            >
              <td className="py-2 pr-3 text-ft-dim">{formatWhen(t.startedAtMs)}</td>
              <td className="py-2 pr-3 text-ft-ink">{t.mode}</td>
              <td className="py-2 pr-3 text-right text-ft-ink">
                {t.wpm.toFixed(0)}
              </td>
              <td className="py-2 pr-3 text-right text-ft-ink">
                {t.accuracy.toFixed(1)}%
              </td>
              <td className="py-2 pr-3 text-right text-ft-dim">
                {t.errorCount}
              </td>
              <td className="py-2 pr-3 text-ft-dim">
                {t.wasCompleted ? "yes" : "no"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FingerMapView({
  layout,
  fingerMapHash,
}: {
  layout: HandLayoutPrefs;
  fingerMapHash: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FingerColumn label="LEFT HAND" ids={LEFT_FINGERS} layout={layout} />
        <FingerColumn label="RIGHT HAND" ids={RIGHT_FINGERS} layout={layout} />
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ft-dim">
        HASH · {fingerMapHash}
      </p>
    </>
  );
}

function FingerColumn({
  label,
  ids,
  layout,
}: {
  label: string;
  ids: readonly FingerId[];
  layout: HandLayoutPrefs;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.14em] text-ft-dim">
        {label}
      </span>
      <ul className="flex flex-col gap-1.5 font-mono text-xs">
        {ids.map((id) => {
          const f = layout.fingers[id];
          return (
            <li
              key={id}
              className="flex items-baseline justify-between gap-3 border-b border-ft-line-soft/40 py-1.5 last:border-b-0"
            >
              <span className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    f.enabled ? "bg-ft-ember" : "bg-ft-dim/40",
                  )}
                  aria-hidden
                />
                <span className="text-ft-ink">{FINGER_NAME[id]}</span>
              </span>
              <span className="text-ft-dim-2">
                {f.enabled ? f.homeKey : "disabled"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = (now - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
