import type { HistorySummaryOutput, HistoryWeakness } from "@/types/history";
import { Panel, TwoUp } from "./panel";
import { WeaknessChart } from "./weakness-chart";

type List = {
  key: string;
  title: string;
  rows: readonly HistoryWeakness[];
  baselineMs: number;
  narrowKeys: boolean;
  empty: string;
};

/** Slowest letter pairs | slowest words, two-up. When one list has no
 *  data yet the other spans both columns (no half-empty hole) and the
 *  missing one is named in a single muted line underneath. */
export function WeakSpots({ snap }: { snap: HistorySummaryOutput }) {
  const lists: List[] = [
    {
      key: "pairs",
      title: "Letter pairs",
      rows: snap.weakestPairs,
      baselineMs: snap.bigramBaselineMs,
      narrowKeys: true,
      empty: "No slow letter pairs yet. Type a bit more.",
    },
    {
      key: "words",
      title: "Words",
      rows: snap.weakestWords,
      baselineMs: snap.wordBaselineMs,
      narrowKeys: false,
      empty: "No slow words yet. Finish a few more tests.",
    },
  ];
  const filled = lists.filter((l) => l.rows.length > 0);
  const missing = lists.filter((l) => l.rows.length === 0);

  if (filled.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-6 text-sm text-muted-foreground">
        Nothing stands out yet. Finish a few more tests and your slowest
        pairs and words will show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TwoUp className="lg:items-start">
        {filled.map((l) => (
          <Panel
            key={l.key}
            title={l.title}
            aside={
              l.baselineMs > 0 ? (
                <span className="tabular-nums">
                  Avg {Math.round(l.baselineMs)} ms
                </span>
              ) : null
            }
            className={filled.length === 1 ? "lg:col-span-2" : undefined}
          >
            <WeaknessChart
              rows={l.rows}
              baselineMs={l.baselineMs}
              narrowKeys={l.narrowKeys}
            />
          </Panel>
        ))}
      </TwoUp>
      {missing.map((l) => (
        <p key={l.key} className="text-sm text-muted-foreground">
          {l.empty}
        </p>
      ))}
    </div>
  );
}
