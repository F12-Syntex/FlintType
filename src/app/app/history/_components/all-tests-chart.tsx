/** Scatter of every test the user has run, plus a linear-regression
 *  trend line. Scales gracefully from 5 tests to 500 — bars-per-day
 *  panels collapse to nothing when the user has < 7 days of data,
 *  whereas a scatter is meaningful from the first test. */
import type { HistoryTest } from "@/types/history";

const W = 1280;
const H = 220;
const MARGIN_BOTTOM = 30;
const MARGIN_RIGHT = 36;

export function AllTestsChart({
  tests,
}: {
  /** Newest-first; we order chronologically inside. */
  tests: readonly HistoryTest[];
}) {
  if (tests.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-xs text-muted-foreground">
        No tests yet. Finish a few runs and your trajectory shows up here.
      </div>
    );
  }

  // Chronological — index 0 is oldest, length-1 is most recent.
  const chrono = [...tests].reverse();
  const xs = chrono.map((_, i) => i);
  const ys = chrono.map((t) => t.wpm);

  const yMin = Math.max(0, Math.floor(Math.min(...ys) - 5));
  const yMax = Math.ceil(Math.max(...ys) + 5);
  const range = Math.max(1, yMax - yMin);

  const xAt = (i: number) =>
    chrono.length === 1
      ? (W - MARGIN_RIGHT) / 2
      : (i / (chrono.length - 1)) * (W - MARGIN_RIGHT);
  const yAt = (v: number) => H - ((v - yMin) / range) * H;

  // Linear regression — least-squares slope/intercept across xs/ys.
  const slope = lineSlope(xs, ys);
  const intercept = lineIntercept(xs, ys, slope);
  const trendStart = intercept;
  const trendEnd = slope * (chrono.length - 1) + intercept;
  // Hide the trend line on a single-test sample (it's degenerate).
  const showTrend = chrono.length >= 2;

  const ticks = niceTicks(yMin, yMax, 4);

  return (
    <svg
      viewBox={`0 0 ${W} ${H + MARGIN_BOTTOM}`}
      width="100%"
      className="block overflow-visible"
    >
      {/* Horizontal grid + y-axis labels */}
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={0}
            x2={W - MARGIN_RIGHT}
            y1={yAt(v)}
            y2={yAt(v)}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
          <text
            x={W - MARGIN_RIGHT + 8}
            y={yAt(v) + 4}
            fontSize="10"
            fill="var(--muted-foreground)"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Trend line */}
      {showTrend ? (
        <line
          x1={xAt(0)}
          y1={yAt(trendStart)}
          x2={xAt(chrono.length - 1)}
          y2={yAt(trendEnd)}
          stroke="var(--primary)"
          strokeWidth="1.4"
          strokeDasharray="4 3"
        />
      ) : null}

      {/* Scatter dots */}
      {chrono.map((t, i) => (
        <circle
          key={t.id}
          cx={xAt(i)}
          cy={yAt(t.wpm)}
          r={i === chrono.length - 1 ? 4.5 : 3}
          fill={
            i === chrono.length - 1
              ? "var(--primary)"
              : "color-mix(in oklch, var(--foreground) 45%, transparent)"
          }
        />
      ))}

      {/* X-axis labels — first test, midpoint, latest. */}
      <text
        x={0}
        y={H + 20}
        fontSize="10"
        fill="var(--muted-foreground)"
      >
        TEST 1
      </text>
      <text
        x={(W - MARGIN_RIGHT) / 2}
        y={H + 20}
        fontSize="10"
        fill="var(--muted-foreground)"
        textAnchor="middle"
      >
        {Math.floor(chrono.length / 2) + 1} OF {chrono.length}
      </text>
      <text
        x={W - MARGIN_RIGHT}
        y={H + 20}
        fontSize="10"
        fill="var(--muted-foreground)"
        textAnchor="end"
      >
        LATEST
      </text>
    </svg>
  );
}

// ─── regression helpers ──────────────────────────────────────────

function lineSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    num += dx * (ys[i]! - meanY);
    den += dx * dx;
  }
  return den > 0 ? num / den : 0;
}

function lineIntercept(xs: number[], ys: number[], slope: number): number {
  if (xs.length === 0) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  return meanY - slope * meanX;
}

/** Round-number tick generator for the y-axis. Aims for ~`target`
 *  ticks across [min, max]. */
function niceTicks(min: number, max: number, target: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const rough = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const scaled = rough / mag;
  const step =
    scaled < 1.5 ? 1 * mag : scaled < 3 ? 2 * mag : scaled < 7 ? 5 * mag : 10 * mag;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max; v += step) out.push(Math.round(v));
  return out;
}

/** Public projection helper — used by the metrics tile to forecast
 *  where the user is heading 30 days from now based on the current
 *  trend. Exported here because it's the same fit the chart draws. */
export function projectWpm(
  tests: readonly HistoryTest[],
  testsAhead: number,
): { slopePerTest: number; projected: number } | null {
  if (tests.length < 5) return null;
  const chrono = [...tests].reverse();
  const xs = chrono.map((_, i) => i);
  const ys = chrono.map((t) => t.wpm);
  const slope = lineSlope(xs, ys);
  const intercept = lineIntercept(xs, ys, slope);
  const lastX = chrono.length - 1;
  return {
    slopePerTest: slope,
    projected: slope * (lastX + testsAhead) + intercept,
  };
}
