import type { SharedTest } from "@/types/share";
import { TraceLegend } from "./og-trace-legend";

/** The share OG image's speed chart: gridlines and the two traces in an
 *  SVG, with every label (the axis figures, the caption and the legend)
 *  laid over it as positioned satori HTML, because satori can't draw
 *  `<text>` inside an SVG. Fixed warm-ink palette, passed in by the
 *  image so both share one set of constants. */

export type TraceChartPalette = {
  /** Gridlines. */
  line: string;
  /** Axis figures, caption and legend labels. */
  text: string;
  /** The raw trace (dimmer, underneath). */
  raw: string;
  /** The wpm trace (the brand spark, on top). */
  ember: string;
};

const W = 880;
const H = 320;
const PAD = { left: 56, right: 16, top: 24, bottom: 36 };
const MONO = "JetBrains Mono";

export function WpmTraceChart({
  history,
  palette,
}: {
  history: NonNullable<SharedTest["wpmHistory"]>;
  palette: TraceChartPalette;
}) {
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yMax = Math.max(...history.map((s) => s.wpm), ...history.map((s) => s.raw), 1) * 1.1;
  const tMax = Math.max(history[history.length - 1]!.t, 1);
  const x = (t: number) => PAD.left + (t / tMax) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const wpmPath = pathFor(history.map((s) => [x(s.t), y(s.wpm)] as const));
  const rawPath = pathFor(history.map((s) => [x(s.t), y(s.raw)] as const));
  // Four even gridlines on a human-readable scale; the figures sit to the
  // left of the plot so the lines span its full width.
  const niceMax = niceCeil(yMax);
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const seconds = Math.round(tMax / 1000);
  const caption = { display: "flex", fontFamily: MONO, fontSize: 11, fontWeight: 500, color: palette.text, lineHeight: 1 } as const;

  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        {yTicks.map((v) => (
          <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={palette.line} strokeWidth={1} />
        ))}
        <path d={rawPath} stroke={palette.raw} strokeWidth={2} fill="none" />
        <path d={wpmPath} stroke={palette.ember} strokeWidth={3.5} fill="none" />
      </svg>
      {yTicks.map((v) => (
        <span
          key={v}
          style={{
            ...caption,
            position: "absolute",
            left: 0,
            top: y(v) - 6,
            width: PAD.left - 8,
            justifyContent: "flex-end",
            fontSize: 12,
          }}
        >
          {String(Math.round(v))}
        </span>
      ))}
      <span style={{ ...caption, position: "absolute", left: PAD.left, top: H - 20, letterSpacing: "0.22em" }}>
        {`SPEED OVER ${seconds} ${seconds === 1 ? "SECOND" : "SECONDS"}`}
      </span>
      <div style={{ display: "flex", position: "absolute", right: PAD.right, top: H - 20 }}>
        <TraceLegend ember={palette.ember} warm={palette.raw} text={palette.text} />
      </div>
    </div>
  );
}

/** Build an SVG path string from (x, y) points. The first point is
 *  `M`, the rest are `L`. */
function pathFor(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return "";
  return points
    .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");
}

/** Round a number up to a "nice" axis ceiling (multiple of 5/10/25/50
 *  depending on magnitude) so the gridline figures read cleanly rather
 *  than as exact data extremes. */
function niceCeil(v: number): number {
  if (v <= 25) return Math.ceil(v / 5) * 5;
  if (v <= 100) return Math.ceil(v / 10) * 10;
  if (v <= 250) return Math.ceil(v / 25) * 25;
  return Math.ceil(v / 50) * 50;
}
