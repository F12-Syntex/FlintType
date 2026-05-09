"use client";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { AppearanceSectionPage } from "../_components/section-page";
import { ResultRows } from "../_components/result-rows";

/** Static result-card preview — mimics the post-test summary surface
 *  with sample numbers. Honours the user's typing speed unit, decimal
 *  preference, and graph zero-floor — every option in this section
 *  shows up as a visible delta. */
function ResultPreview() {
  const { prefs } = useAppearancePrefs();
  const speed = sampleSpeed(prefs.typingSpeedUnit);
  const formatted = prefs.alwaysShowDecimal
    ? speed.toFixed(2)
    : Math.round(speed).toString();
  const acc = prefs.alwaysShowDecimal ? "96.40" : "96";

  // Sample run with realistic dips so the chart shows actual variance.
  const points = [42, 58, 64, 71, 75, 78, 84, 88, 92, 95, 89, 96, 102, 100, 98];
  const minY = prefs.startGraphsAtZero ? 0 : Math.min(...points) - 5;
  const maxY = Math.max(...points) + 5;
  const W = 320;
  const H = 96;
  const stepX = W / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = (i * stepX).toFixed(1);
      const y = (H - ((p - minY) / (maxY - minY)) * H).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-baseline gap-6 font-mono">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {prefs.typingSpeedUnit.toUpperCase()}
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-primary">
            {formatted}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Accuracy
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
            {acc}%
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Time
          </span>
          <span className="text-3xl font-bold tabular-nums tracking-[-0.03em] text-foreground">
            30s
          </span>
        </div>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={H - 0.5}
          x2={W}
          y2={H - 0.5}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {prefs.startGraphsAtZero
          ? "Y-axis floored at 0"
          : "Y-axis auto-fits the data"}
      </span>
    </div>
  );
}

function sampleSpeed(unit: string): number {
  // Same notional run (98 wpm) reformatted into each unit so the
  // preview number changes when the user toggles the speed unit.
  switch (unit) {
    case "cpm":
      return 98 * 5;
    case "wps":
      return 98 / 60;
    case "cps":
      return (98 * 5) / 60;
    case "wph":
      return 98 * 60;
    default:
      return 98;
  }
}

export default function ResultPage() {
  return (
    <AppearanceSectionPage id="result" preview={<ResultPreview />}>
      <ResultRows />
    </AppearanceSectionPage>
  );
}
