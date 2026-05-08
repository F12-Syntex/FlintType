import { Tag } from "@/components/ft";
import type { HistoryWeakness } from "@/types/history";

/** Top-N weaknesses panel. We don't store historical bigram snapshots
 *  on the server — the running-mean Welford state is point-in-time —
 *  so this is a current ranking, not an evolution. The longer-term
 *  history view can be re-introduced once we add periodic snapshotting. */
export function PairEvolution({
  pairs,
  baselineMs,
  itemLabel = "PAIR",
}: {
  pairs: readonly HistoryWeakness[];
  baselineMs: number;
  /** Header label for the key column. Defaults to "PAIR" for the
   *  bigram surface; pass "TRIGRAM" when reusing this for trigrams. */
  itemLabel?: string;
}) {
  if (pairs.length === 0) {
    return (
      <div className="py-6 text-xs text-muted-foreground">
        Not enough samples yet — keep typing and weak {itemLabel.toLowerCase()}s will surface here.
      </div>
    );
  }
  const maxWeakness = pairs.reduce((m, p) => Math.max(m, p.weakness), 0);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[60px_1fr_70px_60px] gap-3.5 border-b border-foreground/10 py-3">
        <Tag>{itemLabel}</Tag>
        <Tag>WEAKNESS</Tag>
        <Tag className="text-right">MEAN</Tag>
        <Tag className="text-right">N</Tag>
      </div>
      {pairs.map((p) => {
        const widthPct =
          maxWeakness > 0 ? (p.weakness / maxWeakness) * 100 : 0;
        const overBaselineMs = Math.max(0, p.meanMs - baselineMs);
        return (
          <div
            key={p.key}
            className="grid grid-cols-[60px_1fr_70px_60px] items-center gap-3.5 border-b border-foreground/10 py-3"
          >
            <span className="font-mono text-sm font-semibold">{p.key}</span>
            <div className="relative h-5 w-full overflow-hidden bg-muted">
              <div
                className="absolute top-0 left-0 h-full bg-primary"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              +{Math.round(overBaselineMs)}ms
            </span>
            <span className="text-right text-xs tabular-nums text-muted-foreground/70">
              {p.sampleCount}
            </span>
          </div>
        );
      })}
    </div>
  );
}
