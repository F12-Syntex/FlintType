"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Stat } from "@/components/ft";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import type { LiveStatStyle } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { formatClock } from "@/lib/format-duration";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import { cn } from "@/lib/utils";
import { errorCount } from "@/lib/wpm";
import { usePractice } from "./practice-state";

// Readouts hold milliseconds; the shared m:ss formatter takes seconds.
function formatElapsed(ms: number): string {
  return formatClock(ms / 1000);
}

/** Toggle that turns true for ~1.5s every 15s — drives the "flash"
 *  variant of the live readouts so the screen stays clean otherwise. */
function useFlashVisible(active: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const id = setInterval(() => {
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 1500);
    }, 15_000);
    return () => {
      clearInterval(id);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [active]);
  return visible;
}

/** Apply a `LiveStatStyle` to a single readout. Returns
 *    - rendered=false → don't render at all (off, or flash hidden)
 *    - cls           → extra class names for sizing variants
 */
function useLiveStatGate(style: LiveStatStyle): {
  rendered: boolean;
  cls: string;
} {
  const flash = useFlashVisible(style === "flash");
  if (style === "off") return { rendered: false, cls: "" };
  if (style === "flash") return { rendered: flash, cls: "" };
  if (style === "mini") return { rendered: true, cls: "scale-90 opacity-80" };
  return { rendered: true, cls: "" };
}

function useStatsProps(): StatsProps {
  const { state, elapsedMs, wpm, accuracy, wpmHistory } = usePractice();
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const running = state.phase === "running" || state.phase === "done";
  const wordCount = state.words.length;
  const wordIdx = Math.min(state.cursorWord + (running ? 1 : 0), wordCount);
  const isTime = state.mode === "TIME";
  const remainingMs = isTime
    ? Math.max(0, state.length * 1000 - elapsedMs)
    : 0;

  const blind = behaviour.blindMode;
  // Each per-stat style is the single source of truth — `"off"` is a
  // valid value, so behaviour no longer needs a duplicate gating
  // boolean. Blind mode is the one master kill-switch that hides
  // everything regardless of the styled value.
  const speedStyle: LiveStatStyle = blind ? "off" : appearance.liveSpeedStyle;
  const accuracyStyle: LiveStatStyle = blind
    ? "off"
    : appearance.liveAccuracyStyle;
  const progressStyle: LiveStatStyle = blind ? "off" : appearance.liveProgressStyle;
  const burstStyle: LiveStatStyle = blind ? "off" : appearance.liveBurstStyle;

  const burst = wpmHistory.reduce((m, s) => (s.wpm > m ? s.wpm : m), wpm);

  const containerStyle: CSSProperties = {
    opacity: appearance.liveStatsOpacity,
    color: appearance.liveStatsColor || undefined,
  };

  return {
    wpm,
    accuracy,
    burst,
    // Per-character error count (incorrect + extra), the SAME metric the
    // results screen shows — so the live ERR and the final ERRORS always
    // agree. (Was errorWords.size, a per-word count that diverged from
    // the results' per-keystroke total.)
    errs: errorCount(state.typed, state.words, false),
    wordIdx,
    wordCount,
    elapsedMs,
    running,
    speedStyle,
    accuracyStyle,
    progressStyle,
    burstStyle,
    isTime,
    remainingMs,
    unit: appearance.typingSpeedUnit,
    alwaysDecimal: appearance.alwaysShowDecimal,
    style: containerStyle,
  };
}

/** Desktop-only readouts strip. Mobile uses <MobileReadouts /> embedded
 *  inside <RestHint />'s footer row so the stats sit alongside the
 *  cancel control instead of taking a separate rail above the passage. */
export function Readouts() {
  // Hooks must run in the same order on every render — call
  // useStatsProps() and useAppearancePrefs() unconditionally before
  // any early return. Gating renders below.
  const { prefs } = useAppearancePrefs();
  const statsProps = useStatsProps();
  if (prefs.statStripSurface === "none") return null;
  const stats = <DesktopStats {...statsProps} />;
  if (prefs.statStripSurface === "card") {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-3">
        {stats}
      </div>
    );
  }
  return stats;
}

/** Inline pip row for mobile — no chrome (no border, no bg, no padding).
 *  Consumer wraps it in whatever footer container makes sense. */
export function MobileReadouts() {
  const { prefs } = useAppearancePrefs();
  const statsProps = useStatsProps();
  if (prefs.statStripSurface === "none") return null;
  return <MobileStrip {...statsProps} />;
}

type StatsProps = {
  wpm: number;
  accuracy: number;
  burst: number;
  errs: number;
  wordIdx: number;
  wordCount: number;
  elapsedMs: number;
  running: boolean;
  speedStyle: LiveStatStyle;
  accuracyStyle: LiveStatStyle;
  progressStyle: LiveStatStyle;
  burstStyle: LiveStatStyle;
  isTime: boolean;
  remainingMs: number;
  unit: ReturnType<typeof useAppearancePrefs>["prefs"]["typingSpeedUnit"];
  alwaysDecimal: boolean;
  style: CSSProperties;
};

function MobileStrip(props: StatsProps) {
  const {
    wpm,
    accuracy,
    burst,
    errs,
    wordIdx,
    wordCount,
    running,
    speedStyle,
    accuracyStyle,
    progressStyle,
    burstStyle,
    isTime,
    remainingMs,
    unit,
    alwaysDecimal,
    style,
  } = props;
  const speed = useLiveStatGate(speedStyle);
  const acc = useLiveStatGate(accuracyStyle);
  const prog = useLiveStatGate(progressStyle);
  const burstGate = useLiveStatGate(burstStyle);

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums"
      style={style}
    >
      {speed.rendered ? (
        <Pip
          label={SPEED_UNIT_LABEL[unit]}
          value={formatSpeed(wpm, unit, alwaysDecimal)}
          tone={running ? "primary" : "ink"}
          cls={speed.cls}
        />
      ) : null}

      {acc.rendered ? (
        <Pip label="acc" value={`${Math.round(accuracy)}%`} cls={acc.cls} />
      ) : null}
      {/* Errors only matter while running; behaviour blind-mode hides
          everything anyway via the upstream stat-style gates. WPM
          already carries the single primary accent — keep err in
          foreground so the rail has one focal point. */}
      {running ? <Pip label="err" value={String(errs)} /> : null}
      {burstGate.rendered ? (
        <Pip
          label="burst"
          value={formatSpeed(burst, unit, alwaysDecimal)}
          cls={burstGate.cls}
        />
      ) : null}
      {prog.rendered ? (
        isTime ? (
          <Pip
            label="left"
            value={formatElapsed(remainingMs)}
            cls={prog.cls}
          />
        ) : (
          <Pip
            label="word"
            value={`${wordIdx}/${wordCount}`}
            cls={prog.cls}
          />
        )
      ) : null}
    </div>
  );
}

function Pip({
  label,
  value,
  tone = "ink",
  cls,
}: {
  label: string;
  value: string;
  tone?: "ink" | "primary";
  cls?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1", cls)}>
      <span
        className={cn(
          "text-sm font-semibold tracking-tight",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function DesktopStats(props: StatsProps) {
  const {
    wpm,
    accuracy,
    burst,
    errs,
    wordIdx,
    wordCount,
    elapsedMs,
    running,
    speedStyle,
    accuracyStyle,
    progressStyle,
    burstStyle,
    isTime,
    remainingMs,
    unit,
    alwaysDecimal,
    style,
  } = props;
  const speed = useLiveStatGate(speedStyle);
  const acc = useLiveStatGate(accuracyStyle);
  const prog = useLiveStatGate(progressStyle);
  const burstGate = useLiveStatGate(burstStyle);

  const sizeFor = (cls: string) =>
    cls.includes("scale-90") ? ("md" as const) : ("lg" as const);

  return (
    <div
      className="hidden flex-wrap items-end justify-between gap-4 select-none md:flex"
      style={style}
    >
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        {prog.rendered ? (
          isTime ? (
            <Stat
              label="REMAINING"
              value={formatElapsed(remainingMs)}
              size={sizeFor(prog.cls)}
              accent={running}
            />
          ) : (
            <>
              <Stat
                label="ELAPSED"
                value={formatElapsed(elapsedMs)}
                size={sizeFor(prog.cls)}
              />
              <Stat
                label="WORD"
                value={`${wordIdx}/${wordCount}`}
                size={sizeFor(prog.cls)}
              />
            </>
          )
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-12 gap-y-3">
        {speed.rendered ? (
          <Stat
            label={SPEED_UNIT_LABEL[unit].toUpperCase()}
            value={formatSpeed(wpm, unit, alwaysDecimal)}
            size={sizeFor(speed.cls)}
            accent={running}
            align="right"
          />
        ) : null}
        {acc.rendered ? (
          <Stat
            label="ACC"
            value={`${Math.round(accuracy)}%`}
            size={sizeFor(acc.cls)}
            align="right"
          />
        ) : null}
        {burstGate.rendered ? (
          <Stat
            label="BURST"
            value={formatSpeed(burst, unit, alwaysDecimal)}
            size={sizeFor(burstGate.cls)}
            align="right"
          />
        ) : null}
        {running ? (
          // ERR has no per-stat style of its own, so size it like the
          // group's anchor (WPM) instead of a hardcoded lg — otherwise
          // under the "mini" live-stat style WPM/ACC/BURST shrink to md
          // and ERR stays lg, standing out bigger than the rest.
          <Stat
            label="ERR"
            value={String(errs)}
            size={sizeFor(speed.cls)}
            align="right"
          />
        ) : null}
      </div>
    </div>
  );
}
