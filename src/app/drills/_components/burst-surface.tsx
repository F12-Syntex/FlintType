"use client";

import { type ReactNode, useEffect, useMemo, useReducer, useRef } from "react";
import { useTypingSurfaceMarker } from "@/lib/typing-surface";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import {
  burstAccuracy,
  burstReducer,
  currentItem,
  initialBurstState,
  isReady,
} from "./burst-reducer";
import { StatCard, StatStrip, StatusBlock, StreakPips } from "./burst-stats";
import { BurstWord } from "./burst-word";
import { DrillCleared } from "./drill-cleared";
import { DrillHeader } from "./drill-header";
import { useBurstTyping } from "./use-burst-typing";

/** A burst drill: type each item correctly above the target speed,
 *  `repsPerItem` times in a row, to move on. The engine is the pure
 *  `burst-reducer.ts`; key capture (keyboard and phone soft keyboard)
 *  is `use-burst-typing.ts`. Used by the word, trigram, pangram,
 *  isolation and Burst 1000 drills. Exit is the header's back button;
 *  Esc is deliberately not bound so a stray tap can't end a run. */
type BurstSurfaceProps = {
  title: string;
  subtitle: string;
  items: readonly string[];
  thresholdWpm: number;
  repsPerItem: number;
  /** What one item is, singular ("word", "cluster", "sentence"). */
  unit: string;
  /** Rendered under the status line. Burst 1000 puts its discovery
   *  grid here. */
  progressSlot?: ReactNode;
  /** Fired once per item the moment it's cleared. Burst 1000 records
   *  the word against the user's discovered set. */
  onItemCleared?: (item: string) => void;
  /** Replaces the item-progress card (Burst 1000 shows its total). */
  itemStat?: { value: string; caption: string };
  /** Fired when the user starts again from the clear screen, right
   *  after the run resets. Burst 1000 uses it to pick fresh words. */
  onRestart?: () => void;
};

export function BurstSurface({
  title,
  subtitle,
  items,
  thresholdWpm,
  repsPerItem,
  unit,
  progressSlot,
  onItemCleared,
  itemStat,
  onRestart,
}: BurstSurfaceProps) {
  const [state, dispatch] = useReducer(burstReducer, initialBurstState);
  const config = useMemo(
    () => ({ items, thresholdWpm, repsPerItem }),
    [items, thresholdWpm, repsPerItem],
  );
  const isMobile = useIsMobile();

  // While the run is live the global `F` focus-mode shortcut stands
  // down, so `f` is a typed character. Released on the clear screen.
  useTypingSurfaceMarker(!state.finished);

  const { inputRef, focus, focused, tapToFocus } = useBurstTyping({
    enabled: !state.finished,
    onChar: (char) => dispatch({ type: "KEY", char, now: Date.now(), config }),
    onBackspace: (wordWise) =>
      dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE" }),
  });

  // The item cursor only advances on a cleared item, so each step
  // forward reports the item just behind it.
  const lastClearedIdx = useRef(-1);
  useEffect(() => {
    if (!onItemCleared || state.itemIdx === 0) return;
    const cleared = state.itemIdx - 1;
    if (cleared <= lastClearedIdx.current) return;
    lastClearedIdx.current = cleared;
    const item = items[cleared];
    if (item) onItemCleared(item);
  }, [state.itemIdx, items, onItemCleared]);

  // Finishing grants drill XP once per visit, like sudden death: "Run
  // again" replays without a second grant.
  const { incrementDrillsCompleted } = useLifetimeStats();
  const xpGranted = useRef(false);
  useEffect(() => {
    if (!state.finished || xpGranted.current) return;
    xpGranted.current = true;
    incrementDrillsCompleted();
  }, [state.finished, incrementDrillsCompleted]);

  // Brief win / slow / miss flash, then back to neutral.
  useEffect(() => {
    if (state.lastOutcome == null) return;
    const id = setTimeout(() => dispatch({ type: "RESET_FLASH" }), 350);
    return () => clearTimeout(id);
  }, [state.lastOutcome, state.itemIdx]);

  const restart = () => {
    lastClearedIdx.current = -1;
    dispatch({ type: "RESTART" });
    onRestart?.();
    // Inside the click, so a phone reopens its keyboard.
    focus();
  };

  const target = currentItem(state, config);
  const ready = isReady(state, target);
  const accuracy = `${burstAccuracy(state)}%`;
  const unitLabel = unit.charAt(0).toUpperCase() + unit.slice(1);

  return (
    <>
      {/* Visually hidden, but focused while the run is live so a phone
       *  raises its soft keyboard. In-flow size, not display:none: iOS
       *  only opens the keyboard for a rendered field. */}
      <input
        ref={inputRef}
        type="text"
        aria-label="Typing input"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="done"
        tabIndex={-1}
        className="pointer-events-none fixed bottom-0 left-0 size-px opacity-0"
      />
      <DrillHeader title={title} subtitle={subtitle} />

      {state.finished ? (
        <DrillCleared
          title="You cleared the run"
          stats={[
            { label: "Successful bursts", value: String(state.totalWins) },
            { label: "Accuracy", value: accuracy },
          ]}
          onRetry={restart}
        />
      ) : (
        <section
          aria-label={`${title}: type each ${unit}, then press space`}
          className="flex min-h-0 flex-1 cursor-text flex-col items-stretch gap-8 py-8 sm:gap-12"
          {...tapToFocus}
        >
          <StatStrip>
            <StatCard value={`${thresholdWpm} wpm`} caption="Target" />
            <StatCard value={`${state.reps} of ${repsPerItem}`} caption="Streak" />
            <StatCard
              value={
                itemStat?.value ??
                `${Math.min(state.itemIdx + 1, items.length)} of ${items.length}`
              }
              caption={itemStat?.caption ?? unitLabel}
            />
            <StatCard value={accuracy} caption="Accuracy" />
          </StatStrip>

          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <BurstWord
              target={target}
              typed={state.typed}
              outcome={state.lastOutcome}
              ready={ready}
            />
            <StreakPips
              total={repsPerItem}
              done={state.reps}
              failed={state.lastOutcome === "wrong"}
            />
            <StatusBlock
              ready={ready}
              outcome={state.lastOutcome}
              lastWpm={state.lastWpm}
              thresholdWpm={thresholdWpm}
              idleLabel={
                isMobile && !focused ? "Tap to type" : `Type the ${unit}`
              }
            />
          </div>

          {progressSlot}
        </section>
      )}
    </>
  );
}
