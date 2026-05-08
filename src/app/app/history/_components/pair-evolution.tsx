import { Tag } from "@/components/ft";
import type { HistoryWeakness } from "@/types/history";

/** Top-N weaknesses panel. We don't store historical bigram snapshots
 *  on the server — the running-mean Welford state is point-in-time —
 *  so this is a current ranking, not an evolution. The longer-term
 *  history view can be re-introduced once we add periodic snapshotting. */
export function PairEvolution({
  pairs,
  baselineMs,
}: {
  pairs: readonly HistoryWeakness[];
  baselineMs: number;
}) {
  if (pairs.length === 0) {
    return (
      <div className="py-6 text-xs text-ft-dim">
        Not enough samples yet — keep typing and weak pairs will surface here.
      </div>
    );
  }
  const maxWeakness = pairs.reduce((m, p) => Math.max(m, p.weakness), 0);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[50px_1fr_70px_60px] gap-3.5 border-b border-ft-line-soft py-3">
        <Tag>PAIR</Tag>
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
            className="grid grid-cols-[50px_1fr_70px_60px] items-center gap-3.5 border-b border-ft-line-soft py-3"
          >
            <span className="font-mono text-sm font-semibold">{p.key}</span>
            <div className="relative h-5 w-full overflow-hidden bg-ft-line-soft/40">
              <div
                className="absolute top-0 left-0 h-full bg-ft-ember"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="text-right text-xs tabular-nums text-ft-dim-2">
              +{Math.round(overBaselineMs)}ms
            </span>
            <span className="text-right text-xs tabular-nums text-ft-dim">
              {p.sampleCount}
            </span>
          </div>
        );
      })}
    </div>
  );
}
