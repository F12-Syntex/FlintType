"use client";

import { useEffect, useRef } from "react";
import { LabelledProgress } from "@/components/analysis/labelled-progress";
import { SpectateIndicator } from "@/components/spectate-indicator";
import { InputCapture } from "@/app/_components/input-capture";
import { Passage } from "@/app/_components/passage";
import {
  PracticeProvider,
  usePractice,
} from "@/app/_components/practice-state";
import { ReportActivity } from "@/app/_components/report-activity";
import { useLifetimeStats } from "@/lib/use-lifetime-stats";
import { DrillCleared } from "./drill-cleared";
import { DrillHeader } from "./drill-header";

/** Sudden-death runner that piggybacks on the practice surface.
 *
 *  The PracticeProvider wraps the run with `lockedWords={words}` and
 *  `suddenDeath` — the locked words pin the passage to the drill's
 *  list, and the suddenDeath flag forces stopOnError plus auto-restart
 *  on any wrong keystroke. Inside, we render the same `<Passage>` the
 *  practice page uses, so the user's typography, caret style, color
 *  overrides, line scrolling, and tape-mode preferences all apply
 *  unchanged.
 *
 *  Typing goes through the same <InputCapture> as the practice page:
 *  a focused hidden input, so a phone raises its soft keyboard when the
 *  passage is tapped. The drill adds a clear screen when the run
 *  reaches phase===done and a footer strip with the reset count. */
export function SuddenDeathSurface({
  title,
  subtitle,
  words,
}: {
  title: string;
  subtitle: string;
  words: readonly string[];
}) {
  return (
    <>
      <DrillHeader title={title} subtitle={subtitle} />
      <PracticeProvider lockedWords={words} suddenDeath>
        <ReportActivity status="practicing" />
        <InputCapture>
          <Body />
        </InputCapture>
      </PracticeProvider>
    </>
  );
}

const INTERACTIVE = "button, a, input, select, textarea, [role='radio'], [role='switch']";

function Body() {
  const { state, suddenDeathRestarts, restart } = usePractice();
  const totalWords = state.words.length;
  const done = state.phase === "done";

  // Drill completion → +XP via lifetime-stats. One grant per mount;
  // restart re-runs the same `Body` instance without unmounting so
  // the ref blocks a second grant until the next visit.
  const { incrementDrillsCompleted } = useLifetimeStats();
  const xpGrantedRef = useRef(false);
  useEffect(() => {
    if (!done || xpGrantedRef.current) return;
    xpGrantedRef.current = true;
    incrementDrillsCompleted();
  }, [done, incrementDrillsCompleted]);

  return (
    // No horizontal padding: the runner page owns the column (§10.3).
    // mousedown's default would move focus off <InputCapture>'s hidden
    // input right after its tap handler focuses it (closing a phone's
    // keyboard), so it's prevented on everything but real controls.
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 pt-6 pb-3 sm:gap-6 sm:py-8"
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest(INTERACTIVE)) e.preventDefault();
      }}
    >
      {!done ? <SpectateIndicator /> : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {done ? (
          <DrillCleared
            title="Clean run"
            stats={[
              { label: "Words", value: String(totalWords) },
              { label: "Resets", value: String(suddenDeathRestarts) },
            ]}
            onRetry={restart}
          />
        ) : (
          <Passage />
        )}
      </div>
      <SuddenDeathFooter
        cursorWord={state.cursorWord}
        totalWords={totalWords}
        restarts={suddenDeathRestarts}
        done={done}
        resting={state.phase === "rest"}
      />
    </div>
  );
}

/** Footer strip with the sudden-death stats: words cleared in this
 *  attempt and resets burned. Before the first key on a phone it also
 *  says how to raise the keyboard. Hidden on the clear screen, which
 *  shows the same numbers. */
function SuddenDeathFooter({
  cursorWord,
  totalWords,
  restarts,
  done,
  resting,
}: {
  cursorWord: number;
  totalWords: number;
  restarts: number;
  done: boolean;
  resting: boolean;
}) {
  if (done) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <LabelledProgress
        className="w-40"
        value={cursorWord}
        max={totalWords}
        startLabel="Progress"
        endLabel={`${cursorWord} of ${totalWords} words`}
        valueText={`${cursorWord} of ${totalWords} words`}
      />
      <span className="flex items-center gap-1.5 tabular-nums">
        Resets
        <span
          className={
            restarts > 0 ? "font-semibold text-destructive" : "text-foreground"
          }
        >
          {restarts}
        </span>
      </span>
      <span>One miss restarts the run</span>
      {resting ? (
        <span className="font-medium text-foreground md:hidden">
          Tap the words to type
        </span>
      ) : null}
    </div>
  );
}
