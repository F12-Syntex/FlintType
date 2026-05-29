"use client";

import { Stat, Tag } from "@/components/ft";
import {
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  type FingerId,
  type HandLayoutPrefs,
} from "@/lib/hand-layout";
import { relativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput, AdaptTestSummary } from "@/types/adapt";

/* ─── Overview ─────────────────────────────────────────────────── */

export function OverviewBody({ snap }: { snap: AdaptSnapshotOutput }) {
  const patterns =
    snap.bigrams.length + snap.trigrams.length + snap.motorFeatures.length;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 divide-foreground/10 sm:grid-cols-4 sm:divide-x">
        <Stat
          label="STATUS"
          size="lg"
          value={snap.cold ? "Cold" : "Warm"}
          accent={!snap.cold}
          className="pb-5 sm:pr-6 sm:pb-0"
        />
        <Stat
          label="BIGRAM SAMPLES"
          size="lg"
          value={snap.totalBigramSamples.toLocaleString()}
          className="pb-5 sm:pr-6 sm:pb-0 sm:pl-6"
        />
        <Stat
          label="FATIGUE × WEAKNESS"
          size="lg"
          value={snap.fatigueDampener.toFixed(2)}
          accent={snap.fatigueDampener < 1}
          className="pt-5 sm:pr-6 sm:pt-0 sm:pl-6"
        />
        <Stat
          label="PATTERNS TRACKED"
          size="lg"
          value={patterns.toLocaleString()}
          className="pt-5 sm:pt-0 sm:pl-6"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <BaselineCard label="BIGRAM BASELINE" ms={snap.baselines.bigram} />
        <BaselineCard label="TRIGRAM BASELINE" ms={snap.baselines.trigram} />
        <BaselineCard
          label="MOTOR FEATURE BASELINE"
          ms={snap.baselines.motorFeature}
        />
      </div>

      {snap.cold ? (
        <div className="border-l-2 border-primary/70 pl-4">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The model needs ~200 bigram samples before it leaves cold start
            and begins biasing word selection. Until then, every passage is
            a uniform-random draw from the standard pool.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BaselineCard({ label, ms }: { label: string; ms: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-foreground/10 bg-card/40 p-4">
      <Tag>{label}</Tag>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {ms.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground">ms</span>
      </div>
    </div>
  );
}

/* ─── Recent tests ─────────────────────────────────────────────── */

export function RecentTests({ tests }: { tests: AdaptTestSummary[] }) {
  if (tests.length === 0) {
    return (
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        No completed tests on record.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-foreground/10">
      <table className="w-full font-mono text-xs tabular-nums">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/[0.02] text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <th className="py-3 pr-3 pl-4">WHEN</th>
            <th className="py-3 pr-3">MODE</th>
            <th className="py-3 pr-3 text-right">WPM</th>
            <th className="py-3 pr-3 text-right">ACC</th>
            <th className="py-3 pr-3 text-right">ERRORS</th>
            <th className="py-3 pr-4 text-right">FINISHED</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr
              key={t.id}
              className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
            >
              <td className="py-2.5 pr-3 pl-4 text-muted-foreground">
                {relativeTime(t.startedAtMs)}
              </td>
              <td className="py-2.5 pr-3 text-foreground">{t.mode}</td>
              <td className="py-2.5 pr-3 text-right text-foreground">
                {t.wpm.toFixed(0)}
              </td>
              <td className="py-2.5 pr-3 text-right text-foreground">
                {t.accuracy.toFixed(1)}%
              </td>
              <td className="py-2.5 pr-3 text-right text-muted-foreground">
                {t.errorCount}
              </td>
              <td className="py-2.5 pr-4 text-right">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    t.wasCompleted ? "text-foreground" : "text-primary",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      t.wasCompleted ? "bg-foreground/40" : "bg-primary",
                    )}
                  />
                  {t.wasCompleted ? "yes" : "no"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Recency map ──────────────────────────────────────────────── */

export function RecencyMap({
  rows,
}: {
  rows: { word: string; testsAgo: number }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Nothing in the recency map yet.
      </p>
    );
  }
  // Sort by recency (newest first) so the layout reads as a fade.
  const sorted = [...rows].sort((a, b) => a.testsAgo - b.testsAgo);
  const maxAgo = Math.max(...sorted.map((r) => r.testsAgo), 1);

  return (
    <ul className="flex flex-wrap gap-1.5">
      {sorted.map((r) => {
        // Fresher words (lower testsAgo) sit closer to full opacity.
        const opacity = 1 - (r.testsAgo / (maxAgo + 1)) * 0.55;
        return (
          <li
            key={r.word}
            style={{ opacity }}
            className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 bg-card/40 px-2 py-1 font-mono text-xs tabular-nums transition-opacity hover:opacity-100"
          >
            <span className="text-foreground">{r.word}</span>
            <span className="text-muted-foreground">·{r.testsAgo}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Finger map ───────────────────────────────────────────────── */

export function FingerMapView({
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
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        HASH · <span className="text-foreground/70">{fingerMapHash}</span>
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
    <div className="flex flex-col gap-3 rounded-md border border-foreground/10 bg-card/40 p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-col gap-0 font-mono text-xs">
        {ids.map((id) => {
          const f = layout.fingers[id];
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border-b border-foreground/5 py-2 last:border-b-0"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    f.enabled ? "bg-primary" : "bg-foreground/20",
                  )}
                  aria-hidden
                />
                <span className="text-foreground">{FINGER_NAME[id]}</span>
              </span>
              {f.enabled ? (
                <span className="rounded-sm border border-foreground/10 border-b-2 bg-background px-1.5 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                  {f.homeKey}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  disabled
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

