"use client";

import Link from "next/link";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import { Passage } from "@/app/_components/passage";
import {
  PracticeProvider,
  usePractice,
} from "@/app/_components/practice-state";
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
 *  The only thing the drill adds on top is a "drill clear" overlay
 *  when the run reaches phase===done and a footer strip showing the
 *  current restart count. */
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
        <Body />
      </PracticeProvider>
    </>
  );
}

function Body() {
  const { state, suddenDeathRestarts, restart } = usePractice();
  const totalWords = state.words.length;
  const done = state.phase === "done";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-6 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {done ? (
          <DrillCleared
            words={totalWords}
            restarts={suddenDeathRestarts}
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
      />
    </div>
  );
}

/** Full-clear celebration. Sits inside the same layout shell as the
 *  Passage so swapping in/out doesn't shift other chrome. The retry
 *  affordance re-uses the locked words (PracticeProvider.restart in
 *  drill mode) — same exercise, fresh attempt. */
function DrillCleared({
  words,
  restarts,
  onRetry,
}: {
  words: number;
  restarts: number;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <Tag>Drill clear</Tag>
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Clean run.
      </h2>
      <div className="flex items-center gap-12 text-muted-foreground">
        <Stat label="Words" value={words.toString()} />
        <Stat label="Resets burned" value={restarts.toString()} />
      </div>
      <div className="flex gap-3">
        <Button onClick={onRetry}>Run again</Button>
        <Link
          href="/drills"
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back to drills
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

/** Footer strip that surfaces the unique sudden-death stats — words
 *  cleared so far in the current attempt and how many resets have
 *  burned. Hidden when the drill is done since the cleared overlay
 *  takes over and a duplicate counter would look noisy. */
function SuddenDeathFooter({
  cursorWord,
  totalWords,
  restarts,
  done,
}: {
  cursorWord: number;
  totalWords: number;
  restarts: number;
  done: boolean;
}) {
  if (done) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5 tabular-nums">
        <span className="text-[10px] uppercase tracking-[0.18em]">
          Progress
        </span>
        <span className="font-semibold text-foreground">
          {cursorWord} / {totalWords}
        </span>
      </span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <span className="text-[10px] uppercase tracking-[0.18em]">
          Resets
        </span>
        <span
          className={
            restarts > 0 ? "font-semibold text-destructive" : "text-foreground"
          }
        >
          {restarts}
        </span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.18em]">
        One miss = back to word 1
      </span>
    </div>
  );
}
