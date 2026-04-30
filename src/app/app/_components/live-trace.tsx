import { Tag } from "@/components/ft";

const POINTS = [60, 72, 88, 95, 102, 90, 78, 95, 110, 118, 105, 92, 88, 96, 104, 92];

export function LiveTrace() {
  const w = 1280;
  const h = 36;
  const max = 130;
  const path = POINTS.map(
    (p, i) =>
      `${i === 0 ? "M" : "L"} ${(i / (POINTS.length - 1)) * w} ${h - (p / max) * h}`,
  ).join(" ");

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between">
        <Tag>RUN TRACE · WPM/SEC</Tag>
        <Tag tone="ember">↑ 118 PEAK · ↓ 60 STALL @ &quot;the&quot;</Tag>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        width="100%"
        height={h}
        className="block"
      >
        {[40, 80, 120].map((v) => (
          <line
            key={v}
            x1={0}
            x2={w}
            y1={h - (v / max) * h}
            y2={h - (v / max) * h}
            stroke="var(--color-ft-line-soft)"
            strokeDasharray="2 4"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke="var(--color-ft-ink)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={(9 / (POINTS.length - 1)) * w}
          cy={h - (118 / max) * h}
          r="3"
          fill="var(--color-ft-ember)"
        />
      </svg>
    </div>
  );
}
