"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Kbd } from "@/components/ft";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import type { LiveStatStyle } from "@/lib/appearance-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { formatClock } from "@/lib/format-duration";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import { keystrokeErrors } from "@/lib/wpm";
import { usePractice } from "./practice-state";
import { Readout, ReadoutRow } from "./readout";

// Readouts hold milliseconds; the shared m:ss formatter takes seconds.
function formatElapsed(ms: number): string {
  return formatClock(ms / 1000);
}

/** The shipped default for the "Live stats color" pref is the brand
 *  hex itself. Treat it as "follow the theme" so other palettes keep
 *  their own primary on the headline number; any other value is a real
 *  user choice and paints every live number. */
const DEFAULT_LIVE_COLOR = "#f97316";

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

/** Apply a `LiveStatStyle` to a single readout: whether it renders at
 *  all (off, or flash currently hidden) and whether it's the quieter
 *  "mini" size. */
function useLiveStatGate(style: LiveStatStyle): { rendered: boolean; mini: boolean } {
  const flash = useFlashVisible(style === "flash");
  if (style === "off") return { rendered: false, mini: false };
  if (style === "flash") return { rendered: flash, mini: false };
  return { rendered: true, mini: style === "mini" };
}

type StatsProps = {
  wpm: number;
  accuracy: number;
  peak: number;
  errs: number;
  wordIdx: number;
  wordCount: number;
  elapsedMs: number;
  running: boolean;
  speedStyle: LiveStatStyle;
  accuracyStyle: LiveStatStyle;
  progressStyle: LiveStatStyle;
  peakStyle: LiveStatStyle;
  isTime: boolean;
  remainingMs: number;
  unit: ReturnType<typeof useAppearancePrefs>["prefs"]["typingSpeedUnit"];
  alwaysDecimal: boolean;
  /** A user-picked live stats colour paints every number; unset, only
   *  the speed is primary and the rest stay ink. */
  customColor: string | undefined;
  style: CSSProperties;
};

function useStatsProps(): StatsProps {
  const { state, elapsedMs, wpm, accuracy, wpmHistory } = usePractice();
  const { prefs: behaviour } = useBehaviourPrefs();
  const { prefs: appearance } = useAppearancePrefs();
  const running = state.phase === "running" || state.phase === "done";
  const wordCount = state.words.length;
  const wordIdx = Math.min(state.cursorWord + (running ? 1 : 0), wordCount);
  const isTime = state.mode === "TIME";
  const remainingMs = isTime ? Math.max(0, state.length * 1000 - elapsedMs) : 0;

  // Each per-stat style is the single source of truth (`"off"` hides
  // it). Blind mode is the master kill-switch over all of them.
  const blind = behaviour.blindMode;
  const gate = (s: LiveStatStyle): LiveStatStyle => (blind ? "off" : s);

  const color = appearance.liveStatsColor?.trim();
  const customColor =
    color && color.toLowerCase() !== DEFAULT_LIVE_COLOR ? color : undefined;

  return {
    wpm,
    accuracy,
    peak: wpmHistory.reduce((m, s) => (s.wpm > m ? s.wpm : m), wpm),
    // Keystroke-true error count — every incorrect keypress, including
    // ones later backspaced or blocked by stop-on-error. The SAME metric
    // the results screen and the recorded run use, so live, results and
    // saved values always agree (#51 / FT-016). Must not regress to a
    // typed[]-buffer walk, which reads 0 after a correction.
    errs: keystrokeErrors(state.events),
    wordIdx,
    wordCount,
    elapsedMs,
    running,
    speedStyle: gate(appearance.liveSpeedStyle),
    accuracyStyle: gate(appearance.liveAccuracyStyle),
    progressStyle: gate(appearance.liveProgressStyle),
    peakStyle: gate(appearance.liveBurstStyle),
    isTime,
    remainingMs,
    unit: appearance.typingSpeedUnit,
    alwaysDecimal: appearance.alwaysShowDecimal,
    customColor,
    style: { opacity: appearance.liveStatsOpacity },
  };
}

/** Desktop readouts that ride above the passage. At rest: a single
 *  hint. While running: one left-aligned row, speed in primary and the
 *  rest in ink. Mobile uses <MobileReadouts /> inside <RestHint />. */
export function Readouts() {
  // Hooks run unconditionally before the surface gate below.
  const { prefs } = useAppearancePrefs();
  const statsProps = useStatsProps();
  if (prefs.statStripSurface === "none") return null;
  const stats = <DesktopStats {...statsProps} />;
  if (prefs.statStripSurface === "card") {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-2 shadow-card">
        {stats}
      </div>
    );
  }
  return stats;
}

/** Inline readouts for the mobile footer row — no chrome. */
export function MobileReadouts() {
  const { prefs } = useAppearancePrefs();
  const statsProps = useStatsProps();
  if (prefs.statStripSurface === "none") return null;
  return <MobileStrip {...statsProps} />;
}

function DesktopStats(props: StatsProps) {
  const speed = useLiveStatGate(props.speedStyle);
  const acc = useLiveStatGate(props.accuracyStyle);
  const prog = useLiveStatGate(props.progressStyle);
  const peak = useLiveStatGate(props.peakStyle);
  const { unit, alwaysDecimal, customColor: color } = props;

  if (!props.running) {
    return (
      <ReadoutRow className="items-center text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <span className="font-medium text-foreground">Start typing</span>
          <span aria-hidden className="text-muted-foreground/50">
            ·
          </span>
          <span>
            <Kbd>tab</Kbd> for a new passage
          </span>
        </p>
      </ReadoutRow>
    );
  }

  return (
    <ReadoutRow style={props.style}>
      {speed.rendered ? (
        <Readout
          hero
          accent
          mini={speed.mini}
          color={color}
          label={SPEED_UNIT_LABEL[unit]}
          value={formatSpeed(props.wpm, unit, alwaysDecimal)}
        />
      ) : null}
      {acc.rendered ? (
        <Readout
          mini={acc.mini}
          color={color}
          label="acc"
          value={`${Math.round(props.accuracy)}%`}
        />
      ) : null}
      {/* Errors have no style of their own; they follow speed's size. */}
      {speed.rendered || acc.rendered ? (
        <Readout
          mini={speed.mini}
          color={color}
          label={props.errs === 1 ? "error" : "errors"}
          value={String(props.errs)}
        />
      ) : null}
      {peak.rendered ? (
        <Readout
          mini={peak.mini}
          color={color}
          label="peak"
          value={formatSpeed(props.peak, unit, alwaysDecimal)}
        />
      ) : null}
      {prog.rendered ? (
        props.isTime ? (
          <Readout
            mini={prog.mini}
            color={color}
            label="left"
            value={formatElapsed(props.remainingMs)}
          />
        ) : (
          <>
            <Readout
              mini={prog.mini}
              color={color}
              label="words"
              value={`${props.wordIdx}/${props.wordCount}`}
            />
            <Readout
              mini={prog.mini}
              color={color}
              label="time"
              value={formatElapsed(props.elapsedMs)}
            />
          </>
        )
      ) : null}
    </ReadoutRow>
  );
}

function MobileStrip(props: StatsProps) {
  const speed = useLiveStatGate(props.speedStyle);
  const acc = useLiveStatGate(props.accuracyStyle);
  const prog = useLiveStatGate(props.progressStyle);
  const { unit, alwaysDecimal, customColor: color } = props;

  if (!props.running) {
    return (
      <p className="truncate text-sm text-muted-foreground">
        Tap the text to start
      </p>
    );
  }

  // One line, never wrapping into the restart button: speed, accuracy,
  // errors and progress. Peak stays a desktop readout on phones.
  return (
    <div
      className="flex min-w-0 flex-nowrap items-baseline gap-x-3 overflow-hidden"
      style={props.style}
    >
      {speed.rendered ? (
        <Readout
          compact
          accent
          color={color}
          label={SPEED_UNIT_LABEL[unit]}
          value={formatSpeed(props.wpm, unit, alwaysDecimal)}
        />
      ) : null}
      {acc.rendered ? (
        <Readout
          compact
          color={color}
          label="acc"
          value={`${Math.round(props.accuracy)}%`}
        />
      ) : null}
      <Readout compact color={color} label="err" value={String(props.errs)} />
      {prog.rendered ? (
        <Readout
          compact
          color={color}
          label={props.isTime ? "left" : "words"}
          value={
            props.isTime
              ? formatElapsed(props.remainingMs)
              : `${props.wordIdx}/${props.wordCount}`
          }
        />
      ) : null}
    </div>
  );
}
