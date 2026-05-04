"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Stat } from "@/components/ft";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import type { LiveStatStyle } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

export function Readouts() {
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
  // The behaviour booleans still gate stats off — pref `off` overrides
  // appearance. When behaviour says show, the appearance style decides
  // exactly *how*.
  const speedStyle: LiveStatStyle = blind || !behaviour.liveWpm
    ? "off"
    : appearance.liveSpeedStyle;
  const accuracyStyle: LiveStatStyle = blind || !behaviour.liveAccuracy
    ? "off"
    : appearance.liveAccuracyStyle;
  const progressStyle: LiveStatStyle = blind ? "off" : appearance.liveProgressStyle;
  const burstStyle: LiveStatStyle = blind ? "off" : appearance.liveBurstStyle;

  const burst = wpmHistory.reduce((m, s) => (s.wpm > m ? s.wpm : m), wpm);

  const containerStyle: CSSProperties = {
    opacity: appearance.liveStatsOpacity,
    color: appearance.liveStatsColor || undefined,
  };

  const props: StatsProps = {
    wpm,
    accuracy,
    burst,
    errs: state.errorWords.size,
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

  return (
    <>
      <MobileStrip {...props} />
      <DesktopStats {...props} />
    </>
  );
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

  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-2 text-[11px] tabular-nums md:hidden"
      style={style}
    >
      {speed.rendered ? (
        <div className={cn("flex items-baseline gap-1", speed.cls)}>
          <span
            className={cn(
              "text-base font-bold tracking-tight",
              running ? "text-primary" : "text-foreground",
            )}
          >
            {formatSpeed(wpm, unit, alwaysDecimal)}
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {SPEED_UNIT_LABEL[unit]}
          </span>
        </div>
      ) : null}

      {acc.rendered ? (
        <Pip label="acc" value={`${Math.round(accuracy)}%`} cls={acc.cls} />
      ) : null}
      {/* Errors only matter while running; behaviour blind-mode hides
          everything anyway via the upstream stat-style gates. */}
      {running ? (
        <Pip
          label="err"
          value={String(errs)}
          tone={errs > 0 ? "ember" : "ink"}
        />
      ) : null}
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
  tone?: "ink" | "ember";
  cls?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1", cls)}>
      <span
        className={cn(
          "text-sm font-semibold tracking-tight",
          tone === "ember" ? "text-primary" : "text-foreground",
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
          <Stat label="ERR" value={String(errs)} size="lg" align="right" />
        ) : null}
      </div>
    </div>
  );
}
