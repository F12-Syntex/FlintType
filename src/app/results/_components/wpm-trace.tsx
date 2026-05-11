const POINTS = [60, 72, 88, 95, 102, 90, 78, 95, 110, 118, 105, 92, 88, 96, 104, 92, 86, 78, 90, 98, 105, 100, 88, 92];
const STALLS = [6, 16, 22];

export function WpmTrace() {
  const w = 800;
  const h = 200;
  const max = 130;
  const path = POINTS.map(
    (p, i) =>
      `${i === 0 ? "M" : "L"} ${(i / (POINTS.length - 1)) * w} ${h - (p / max) * h}`,
  ).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const peakIdx = 9;
  const stallIdx = 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${h + 40}`}
      width="100%"
      className="block overflow-visible"
    >
      {[40, 80, 120].map((v) => (
        <g key={v}>
          <line
            x1={0}
            x2={w}
            y1={h - (v / max) * h}
            y2={h - (v / max) * h}
            stroke="var(--color-ft-line-soft)"
            strokeDasharray="2 4"
          />
          <text
            x={w + 6}
            y={h - (v / max) * h + 3}
            fontSize="9"
            fill="var(--color-ft-dim)"
          >
            {v}
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(229,83,42,0.06)" />
      <path
        d={path}
        fill="none"
        stroke="var(--color-ft-ink)"
        strokeWidth="1.4"
      />
      <circle
        cx={(peakIdx / (POINTS.length - 1)) * w}
        cy={h - (118 / max) * h}
        r="4"
        fill="var(--color-ft-ember)"
      />
      <text
        x={(peakIdx / (POINTS.length - 1)) * w + 8}
        y={h - (118 / max) * h - 6}
        fontSize="10"
        fill="var(--color-ft-ember)"
        fontWeight="600"
      >
        118 PEAK
      </text>
      <circle
        cx={(stallIdx / (POINTS.length - 1)) * w}
        cy={h - (60 / max) * h}
        r="4"
        fill="var(--color-ft-ember)"
      />
      <text
        x={6}
        y={h - (60 / max) * h + 16}
        fontSize="10"
        fill="var(--color-ft-ember)"
        fontWeight="600"
      >
        ↓ STALL &quot;th&quot;
      </text>
      {STALLS.map((i) => (
        <line
          key={i}
          x1={(i / (POINTS.length - 1)) * w}
          x2={(i / (POINTS.length - 1)) * w}
          y1={h}
          y2={h + 6}
          stroke="var(--color-ft-ember)"
          strokeWidth="1.5"
        />
      ))}
      <text x={0} y={h + 22} fontSize="9" fill="var(--color-ft-dim)">
        0:00
      </text>
      <text x={w - 30} y={h + 22} fontSize="9" fill="var(--color-ft-dim)">
        0:30
      </text>
    </svg>
  );
}
