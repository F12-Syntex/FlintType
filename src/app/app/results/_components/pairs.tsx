const PAIRS: [string, number, number][] = [
  ["th", 142, 1.0],
  ["ou", 118, 0.83],
  ["sp", 96, 0.68],
  ["re", 84, 0.59],
  ["nt", 72, 0.51],
  ["ly", 64, 0.45],
  ["er", 52, 0.37],
  ["st", 44, 0.31],
];

export function Pairs() {
  return (
    <div className="flex flex-col gap-2">
      {PAIRS.map(([p, ms, w]) => (
        <div
          key={p}
          className="grid grid-cols-[36px_1fr_50px] items-center gap-2.5"
        >
          <span className="text-[13px] font-semibold">{p}</span>
          <div className="relative h-3 bg-ft-line-soft">
            <div
              className="absolute top-0 bottom-0 left-0 bg-ft-ember"
              style={{ width: `${w * 100}%` }}
            />
          </div>
          <span className="text-right text-[11px] tabular-nums text-ft-dim-2">
            +{ms}ms
          </span>
        </div>
      ))}
    </div>
  );
}
