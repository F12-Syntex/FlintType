"use client";

import { Surface } from "@/components/page-shell";
import type { AdaptSnapshotOutput } from "@/types/adapt";

/* ─── Overview ─────────────────────────────────────────────────── */

/** One overview figure. Always ink: these are data, and the page's
 *  orange is kept for its actions and selections. */
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Surface className="flex flex-col gap-1.5 p-4 sm:p-5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
        {value}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Surface>
  );
}

export function OverviewBody({ snap }: { snap: AdaptSnapshotOutput }) {
  const patterns =
    snap.bigrams.length + snap.trigrams.length + snap.motorFeatures.length;
  // The letter pair the model currently rates weakest, if any is weak.
  const weakest = snap.bigrams.reduce<AdaptSnapshotOutput["bigrams"][number] | null>(
    (worst, r) => (r.weakness > 0 && (!worst || r.weakness > worst.weakness) ? r : worst),
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* The letter-pair sample count lives here, named as such: it counts
            pair samples only, not triples or finger moves. */}
        <StatTile
          label="Patterns tracked"
          value={patterns.toLocaleString()}
          hint={`Pairs, triples and finger moves, with ${snap.totalBigramSamples.toLocaleString()} letter-pair samples so far`}
        />
        <StatTile
          label="Words held back"
          value={snap.recentlyShown.length.toLocaleString()}
          hint="Recently shown, kept out for now"
        />
        <StatTile
          label="Pacing"
          value={`× ${snap.fatigueDampener.toFixed(2)}`}
          hint={
            snap.fatigueDampener < 1
              ? "Easing off: tired, less accurate or slower than usual"
              : "At your usual pace"
          }
        />
        <StatTile
          label="Weakest pair"
          value={weakest ? weakest.key : "None yet"}
          hint={
            weakest
              ? `${weakest.meanMs.toFixed(0)} ms on average`
              : "Nothing stands out so far"
          }
        />
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
