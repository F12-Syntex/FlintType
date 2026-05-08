/** Bar-and-trendline chart of the user's WPM by day across a window.
 *  All data is computed by HistoryView and passed in — the component
 *  is purely a layout primitive. */
const W = 1280;
const H = 220;
const MAX = 130;
const MIN = 50;

export type DailyPoint = {
  /** Days from the right edge of the chart. 0 = today, 1 = yesterday, … */
  daysAgo: number;
  /** Best run that day (max wpm), or 0 if no run logged. */
  bestWpm: number;
};

export function DailyChart({
  days,
  movingAvg,
}: {
  /** Newest-first; idx 0 is today. Length = window (e.g. 90). */
  days: readonly DailyPoint[];
  /** Same indexing — 7-day trailing average per day. */
  movingAvg: readonly number[];
}) {
  if (days.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-xs text-ft-dim">
        No runs logged yet — finish a few tests to see your daily curve.
      </div>
    );
  }

  // Internal arrays read oldest→newest so the chart paints left→right.
  const ordered = [...days].reverse();
  const orderedAvg = [...movingAvg].reverse();
  const xAt = (i: number) =>
    ordered.length === 1 ? W : (i / (ordered.length - 1)) * W;
  const yAt = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;

  const avgPath = orderedAvg
    .map((v, i) => (v <= 0 ? null : `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`))
    .filter((s): s is string => s !== null)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 50}`}
      width="100%"
      className="block overflow-visible"
    >
      {[60, 80, 100, 120].map((v) => (
        <g key={v}>
          <line
            x1={0}
            x2={W}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="var(--color-ft-line-soft)"
            strokeDasharray="2 4"
          />
          <text
            x={W + 8}
            y={yAt(v) + 4}
            fontSize="10"
            fill="var(--color-ft-dim)"
          >
            {v}
          </text>
        </g>
      ))}
      {ordered.map((p, i) => {
        if (p.bestWpm <= 0) return null;
        const isToday = i === ordered.length - 1;
        return (
          <rect
            key={i}
            x={xAt(i) - 4}
            width={8}
            y={yAt(p.bestWpm)}
            height={H - yAt(p.bestWpm)}
            fill={isToday ? "var(--color-ft-ember)" : "#D9D2C2"}
          />
        );
      })}
      {avgPath ? (
        <path
          d={avgPath}
          fill="none"
          stroke="var(--color-ft-ink)"
          strokeWidth="1.6"
        />
      ) : null}
      <text x={0} y={H + 20} fontSize="10" fill="var(--color-ft-dim)">
        {ordered.length} DAYS AGO
      </text>
      <text
        x={W / 2}
        y={H + 20}
        fontSize="10"
        fill="var(--color-ft-dim)"
        textAnchor="middle"
      >
        {Math.floor(ordered.length / 2)} DAYS AGO
      </text>
      <text
        x={W}
        y={H + 20}
        fontSize="10"
        fill="var(--color-ft-dim)"
        textAnchor="end"
      >
        TODAY
      </text>
    </svg>
  );
}
