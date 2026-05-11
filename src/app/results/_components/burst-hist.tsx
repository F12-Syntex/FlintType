const BINS = [
  { range: "40-60", n: 2 },
  { range: "60-80", n: 5 },
  { range: "80-100", n: 9 },
  { range: "100-120", n: 7 },
  { range: "120+", n: 1, ceiling: true },
];

const MAX = 9;

export function BurstHist() {
  return (
    <div className="flex h-30 items-end gap-2 pb-1">
      {BINS.map((b) => (
        <div
          key={b.range}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
        >
          <span className="text-[10px] tabular-nums text-ft-dim">{b.n}</span>
          <div
            className={b.ceiling ? "w-full bg-ft-ember" : "w-full bg-ft-ink"}
            style={{ height: `${(b.n / MAX) * 88}px` }}
            aria-hidden
          />
          <span className="text-[9px] tabular-nums text-ft-dim">
            {b.range}
          </span>
        </div>
      ))}
    </div>
  );
}
