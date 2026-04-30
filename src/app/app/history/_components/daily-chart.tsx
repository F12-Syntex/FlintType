// Deterministic 90-day series — sin/cos blend for visual rhythm.
// Server- and client-render must match, so no Math.random.
const DAYS: number[] = Array.from({ length: 90 }, (_, i) => {
  const base = 76 + (i / 90) * 12;
  const noise = Math.sin(i * 0.7) * 4 + Math.cos(i * 0.3) * 3;
  return Math.max(60, Math.min(118, Math.round(base + noise + (i === 88 ? 6 : 0))));
});

const AVG = DAYS.map((_, i) => {
  const s = Math.max(0, i - 6);
  const slice = DAYS.slice(s, i + 1);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
});

const W = 1280;
const H = 220;
const MAX = 130;
const MIN = 50;

const xAt = (i: number) => (i / (DAYS.length - 1)) * W;
const yAt = (v: number) => H - ((v - MIN) / (MAX - MIN)) * H;

const ANNOTATIONS = [
  { i: 28, label: "started ADAPT mode" },
  { i: 56, label: '"th" stall fixed' },
  { i: 89, label: "today", accent: true },
];

export function DailyChart() {
  const avgPath = AVG.map(
    (v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`,
  ).join(" ");

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
      {DAYS.map((v, i) => (
        <rect
          key={i}
          x={xAt(i) - 4}
          width={8}
          y={yAt(v)}
          height={H - yAt(v)}
          fill={i === 89 ? "var(--color-ft-ember)" : "#D9D2C2"}
        />
      ))}
      <path
        d={avgPath}
        fill="none"
        stroke="var(--color-ft-ink)"
        strokeWidth="1.6"
      />
      {ANNOTATIONS.map((a, k) => (
        <g key={k}>
          <line
            x1={xAt(a.i)}
            x2={xAt(a.i)}
            y1={yAt(DAYS[a.i]!) - 6}
            y2={yAt(DAYS[a.i]!) - 28}
            stroke={a.accent ? "var(--color-ft-ember)" : "var(--color-ft-ink)"}
            strokeWidth="1"
          />
          <text
            x={xAt(a.i)}
            y={yAt(DAYS[a.i]!) - 34}
            fontSize="10"
            fill={a.accent ? "var(--color-ft-ember)" : "var(--color-ft-ink)"}
            textAnchor="middle"
            fontWeight="600"
          >
            {a.label}
          </text>
        </g>
      ))}
      <text x={0} y={H + 20} fontSize="10" fill="var(--color-ft-dim)">
        90 DAYS AGO
      </text>
      <text
        x={W / 2}
        y={H + 20}
        fontSize="10"
        fill="var(--color-ft-dim)"
        textAnchor="middle"
      >
        45 DAYS AGO
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
