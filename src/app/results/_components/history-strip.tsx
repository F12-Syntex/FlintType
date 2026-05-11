// Deterministic series — design uses a sin-wave-with-noise; we hardcode so SSR
// matches client and there's no hydration mismatch.
const DAYS = [
  78, 82, 86, 80, 74, 76, 82, 88, 84, 78,
  72, 76, 84, 90, 86, 82, 78, 80, 84, 88,
  86, 82, 84, 90, 92, 88, 84, 86, 90, 92,
];
const MAX = 110;
const MIN = 60;

export function HistoryStrip() {
  return (
    <div className="flex h-24 items-end gap-1 pb-1">
      {DAYS.map((v, i) => {
        const pct = ((v - MIN) / (MAX - MIN)) * 70 + 4;
        const isToday = i === DAYS.length - 1;
        return (
          <div
            key={i}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div
              className={isToday ? "w-full bg-ft-ember" : "w-full bg-ft-ink"}
              style={{ height: `${pct}px` }}
              aria-hidden
            />
            {isToday ? (
              <span className="text-[9px] font-semibold tabular-nums text-ft-ember">
                92
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
