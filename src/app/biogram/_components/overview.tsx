"use client";

import { Surface } from "@/components/page-shell";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput } from "@/types/adapt";

/* ─── Overview ─────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Surface className="flex flex-col gap-1.5 p-4 sm:p-5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-bold tracking-tight tabular-nums sm:text-3xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Surface>
  );
}

export function OverviewBody({ snap }: { snap: AdaptSnapshotOutput }) {
  const patterns =
    snap.bigrams.length + snap.trigrams.length + snap.motorFeatures.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Status"
          value={snap.cold ? "Cold start" : "Warm"}
          hint={snap.cold ? "Still learning your hands" : "Shaping your passages"}
          accent={!snap.cold}
        />
        <StatTile
          label="Letter-pair samples"
          value={snap.totalBigramSamples.toLocaleString()}
        />
        <StatTile
          label="Fatigue damping"
          value={`× ${snap.fatigueDampener.toFixed(2)}`}
          hint={snap.fatigueDampener < 1 ? "Easing off while you're tired" : "No damping"}
        />
        <StatTile label="Patterns tracked" value={patterns.toLocaleString()} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">Your usual pace</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BaselineTile label="Letter pairs" ms={snap.baselines.bigram} />
          <BaselineTile label="Letter triples" ms={snap.baselines.trigram} />
          <BaselineTile label="Finger moves" ms={snap.baselines.motorFeature} />
        </div>
      </div>

      {snap.cold ? (
        <p className="rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-foreground/85">
          The model needs about 200 letter-pair samples before it leaves cold
          start and begins choosing words for you. Until then every passage is
          a random draw from the standard word list.
        </p>
      ) : null}
    </div>
  );
}

function BaselineTile({ label, ms }: { label: string; ms: number }) {
  return (
    <Surface className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:px-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums text-foreground">
          {ms.toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground">ms</span>
      </span>
    </Surface>
  );
}
