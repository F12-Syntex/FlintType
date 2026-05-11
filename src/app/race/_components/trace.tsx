type RacerSeries = {
  name: string;
  color: string;
  pts: number[];
  you?: boolean;
  dash?: boolean;
};

const RACERS: RacerSeries[] = [
  { name: "damiel", color: "var(--color-ft-paper)", pts: [80, 130, 175, 200, 215, 218, 220, 218, 220] },
  { name: "selan", color: "#9C978A", pts: [70, 95, 120, 132, 138, 140, 138, 140, 138] },
  { name: "you", color: "var(--color-ft-ember)", pts: [50, 70, 84, 92, 95, 90, 92, 96, 92], you: true },
  { name: "ghost", color: "#5C5950", pts: [55, 78, 92, 100, 104, 102, 104, 106, 104], dash: true },
  { name: "kassia", color: "#6E695F", pts: [45, 65, 78, 82, 86, 88, 84, 86, 86] },
];

const W = 1280;
const H = 110;
const MAX = 240;

export function RaceTrace() {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
          RACE TRACE · ALL RACERS · WPM/SEC
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ft-ember">
          ↑ damiel pulled away @ 0:08
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        className="block"
      >
        {[60, 120, 180].map((v) => (
          <line
            key={v}
            x1={0}
            x2={W}
            y1={H - (v / MAX) * H}
            y2={H - (v / MAX) * H}
            stroke="#221F1A"
            strokeDasharray="2 4"
          />
        ))}
        {RACERS.map((r) => {
          const path = r.pts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"} ${(i / (r.pts.length - 1)) * W} ${H - (p / MAX) * H}`,
            )
            .join(" ");
          return (
            <path
              key={r.name}
              d={path}
              fill="none"
              stroke={r.color}
              strokeWidth={r.you ? 2 : 1.2}
              strokeDasharray={r.dash ? "3 4" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
    </div>
  );
}
