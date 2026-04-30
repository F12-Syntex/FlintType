import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

type Pair = {
  p: string;
  series: number[];
  note?: "killed" | "next" | "";
};

const PAIRS: Pair[] = [
  { p: "th", series: [142, 138, 130, 118, 95, 70, 48, 34, 26, 22, 20, 18, 18], note: "killed" },
  { p: "ou", series: [86, 84, 88, 84, 90, 86, 84, 88, 84, 86, 84, 82, 82], note: "next" },
  { p: "sp", series: [72, 70, 76, 72, 70, 68, 70, 68, 66, 64, 62, 60, 60] },
  { p: "re", series: [64, 60, 62, 58, 60, 56, 54, 52, 52, 50, 48, 48, 48] },
  { p: "nt", series: [56, 54, 52, 54, 52, 50, 48, 46, 46, 44, 44, 42, 42] },
  { p: "ly", series: [42, 44, 42, 40, 40, 38, 38, 36, 36, 34, 34, 32, 32] },
];

const W = 320;
const H = 28;
const MAX = 160;

export function PairEvolution() {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[50px_1fr_70px_60px] gap-3.5 border-b border-ft-line-soft py-3">
        <Tag>PAIR</Tag>
        <Tag>13 WK TREND</Tag>
        <Tag className="text-right">NOW</Tag>
        <Tag className="text-right">Δ</Tag>
      </div>
      {PAIRS.map(({ p, series, note }) => {
        const start = series[0]!;
        const end = series[series.length - 1]!;
        const delta = end - start;
        const path = series
          .map(
            (v, i) =>
              `${i === 0 ? "M" : "L"} ${(i / (series.length - 1)) * W} ${H - (v / MAX) * H}`,
          )
          .join(" ");
        const lineColor =
          delta < -20
            ? "var(--color-ft-ok)"
            : delta > 20
              ? "var(--color-ft-ember)"
              : "var(--color-ft-ink)";
        return (
          <div
            key={p}
            className="grid grid-cols-[50px_1fr_70px_60px] items-center gap-3.5 border-b border-ft-line-soft py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{p}</span>
              {note ? (
                <span
                  className={cn(
                    "px-1 py-px text-[8px] tracking-[0.14em] uppercase text-white",
                    note === "killed" ? "bg-ft-ok" : "bg-ft-ember",
                  )}
                >
                  {note}
                </span>
              ) : null}
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              width="100%"
              height={H}
              className="block"
            >
              <path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={W}
                cy={H - (end / MAX) * H}
                r="2.5"
                fill={lineColor}
              />
            </svg>
            <span className="text-right text-xs tabular-nums">+{end}ms</span>
            <span
              className={cn(
                "text-right text-xs tabular-nums",
                delta < 0 ? "text-ft-ok" : "text-ft-ember",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          </div>
        );
      })}
    </div>
  );
}
