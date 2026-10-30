"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { recordIfPb } from "@/lib/pb-cache";
import { formatSpeed } from "@/lib/speed-unit";
import { lengthLabel } from "@/lib/test-name";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { calcWpmAndRaw, keystrokeErrors } from "@/lib/wpm";
import { consistencyScore } from "@/lib/wpm-stats";
import { cn } from "@/lib/utils";
import { useBurstResult } from "./burst-log";
import { burstCaption } from "./burst-stats";
import { PassageHeatmap } from "./passage-heatmap";
import { type State, usePractice } from "./practice-state";
import { ResultActions } from "./result-actions";
import { type Bucket, ResultChart } from "./result-chart";
import { InsightCard } from "./insight-card";
import { HandSplit, PerLetterSlowness } from "./result-insights";
import { ExtraStats } from "./result-run-shape";
import { ReplayView } from "./result-replay";
import { ResultStat } from "./result-stat";
import { RunAnalysis } from "./run-analysis";
import { useRunAnalysis } from "./use-run-analysis";

// ─── Pieces ────────────────────────────────────────────────────────

/** PB verdict for the crown + confetti on the headline speed.
 *
 *  - Signed in: the server's authoritative verdict (`lastTestIsPb`),
 *    which compares against the user's full history for the bucket.
 *  - Anonymous: the per-browser localStorage cache, cleared on sign-out.
 *
 *  Resets whenever the done screen is left so a stale crown never
 *  carries into the next run. */
function usePbVerdict(preview: boolean): boolean {
  const { state, lastTestIsPb } = usePractice();
  const { isLoaded, isSignedIn } = useUser();
  const [isNewPb, setIsNewPb] = useState(false);
  useEffect(() => {
    if (state.phase !== "done") setIsNewPb(false);
  }, [state.phase]);
  useEffect(() => {
    if (preview || state.phase !== "done" || !isLoaded) return;
    if (isSignedIn) {
      if (lastTestIsPb === true) setIsNewPb(true);
      return;
    }
    // BURST isn't recorded (no signed-in crown), so no local one either.
    if (state.mode === "BURST") return;
    // Recompute the final WPM from state rather than the context `wpm`:
    // that value is the provider's 1 Hz-throttled live stat, and React
    // runs this child effect before the provider snaps it to the final
    // value (false and missed crowns). Mirrors practice-state's submit.
    const durationMs =
      state.startTime != null && state.endTime != null
        ? state.endTime - state.startTime
        : 0;
    const { wpm: finalWpm } = calcWpmAndRaw(
      state.typed,
      state.words,
      durationMs,
      true,
      state.events.length,
    );
    if (recordIfPb(state.mode.toLowerCase(), state.length, Math.round(finalWpm))) {
      setIsNewPb(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, isLoaded, isSignedIn, lastTestIsPb]);
  return isNewPb;
}

/** The test type beside the headline (from sm): what was typed, and from
 *  which word list. Quotes have no word list. */
function TestType({ mode, length, wordlist }: { mode: State["mode"]; length: number; wordlist: string }) {
  const testLabel =
    mode === "TIME"
      ? lengthLabel("time", length)
      : mode === "QUOTE"
        ? lengthLabel("quote", length)
        : mode === "BURST"
          ? `Burst of ${lengthLabel("words", length)}`
          : lengthLabel("words", length);
  const listLabel = mode === "QUOTE" ? null : wordlistLabel(wordlist);
  return (
    <dl className="hidden grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm sm:grid">
      <dt className="text-muted-foreground">Test</dt>
      <dd className="font-medium text-foreground">{testLabel}</dd>
      {listLabel ? (
        <>
          <dt className="text-muted-foreground">Word list</dt>
          <dd className="text-foreground">{listLabel}</dd>
        </>
      ) : null}
    </dl>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

/** End-of-run report. The `preview` flag drops the interactive bits
 *  (the action row, replay) so the same component renders inside the
 *  customise → Result preview and reads 1:1 against the live screen. */
export function TestSummary({ preview = false }: { preview?: boolean } = {}) {
  const {
    state,
    wpm,
    raw,
    accuracy,
    elapsedMs,
    wpmHistory,
    lastTestId,
    restart,
    wordlist,
  } = usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  const { user } = useUser();
  // The viewer's own handle builds a friendly slug for their share image,
  // mirroring how the server names a SharedTest.
  const shareHandle =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    "racer";
  const [replaying, setReplaying] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const isNewPb = usePbVerdict(preview);
  // The run's analysis, once: the card, Slowest letters and Hand split
  // all read this one view (spec-50 §2.1).
  const view = useRunAnalysis();

  // BURST: every figure comes from the timed tries (burst-stats.ts), not
  // the whole-run clock: this run's try log, or the broadcaster's figures
  // on the live-spectate clone. Null elsewhere, and on a surface with
  // neither (the settings preview), which keeps the regular figures.
  const burstFigures = useBurstResult();
  const burst =
    state.mode === "BURST" && burstFigures ? burstFigures.summary : null;

  // Per-second chart buckets: the live wpmHistory samples, or the
  // running burst figures for a burst run.
  const buckets = useMemo<Bucket[]>(
    () =>
      burst && burstFigures
        ? burstFigures.buckets
        : wpmHistory.map((s) => ({
            sec: Math.max(1, Math.round(s.t / 1000)),
            wpm: s.wpm,
            raw: s.raw,
          })),
    [burst, burstFigures, wpmHistory],
  );
  const cons = burst ? burst.consistency : consistencyScore(buckets);
  // Keystroke-true error count: the SAME metric the live readout and
  // the recorded run use (incorrect keystrokes, including corrected ones).
  const wrongTotal = keystrokeErrors(state.events);
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  const unit = appearance.typingSpeedUnit;
  const decimals = appearance.alwaysShowDecimal;
  const testType = <TestType mode={state.mode} length={state.length} wordlist={wordlist} />;
  // Words that were finished: a timed test ends partway through one.
  const committed =
    state.mode === "TIME" ? Math.min(state.words.length, state.cursorWord) : state.words.length;

  if (replaying) {
    return (
      <ReplayView
        words={state.words}
        events={state.events}
        typedCount={state.typed.length}
        onExit={() => setReplaying(false)}
      />
    );
  }

  const accValue = decimals
    ? `${(Math.round(accuracy * 10) / 10).toFixed(1)}%`
    : `${Math.round(accuracy * 10) / 10}%`;
  const unitLabel = unit.toUpperCase();
  const rawLabel =
    burst && burst.tries > 1 ? `Raw (all ${burst.tries} tries)` : "Raw";

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center overflow-y-auto py-3 sm:py-6",
        // The real screen breaks out of the max-w-5xl column to the full
        // page width, so its scrollbar sits at the window edge instead of
        // mid-page. Previews stay inside their frame.
        !preview && "ml-[calc(50%-50vw)] w-screen px-4 sm:px-6",
      )}
    >
      {/* my-auto centres the report when it fits; once it overflows the
       *  auto margin collapses and the column scrolls naturally. */}
      <div
        ref={captureRef}
        className="my-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6"
      >
        {/* Headline: speed is the answer, accuracy second, then the run's
         *  shape on the chart. */}
        {/* The headline column sizes to its content (min 12rem) so a
         *  long value ("271.0", cpm / wph) plus the PB crown never runs
         *  into the chart card. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(12rem,auto)_minmax(0,1fr)] sm:items-center sm:gap-8">
          <div className="grid grid-cols-[auto_auto] justify-start gap-x-8 gap-y-1.5 sm:flex sm:flex-col sm:items-start sm:gap-5">
            <ResultStat
              tier="hero"
              label={burst ? `Burst ${unitLabel}` : unitLabel}
              value={formatSpeed(burst ? burst.wpm : wpm, unit, decimals)}
              pb={isNewPb}
              subgrid
            />
            <ResultStat tier="lead" label="Accuracy" value={accValue} subgrid />
            {burst ? (
              // The caption spans the phone row too and wraps in a
              // narrow measure, so it never widens the headline column.
              <div className="col-span-2 mt-2 flex max-w-64 flex-col gap-1 text-sm text-muted-foreground sm:mt-0">
                <p>
                  {burstCaption(
                    burst,
                    formatSpeed(burst.best, unit, decimals),
                    unitLabel,
                  )}
                </p>
                {testType}
              </div>
            ) : (
              // Phones already show this in the settings pill above.
              testType
            )}
          </div>
          <div
            data-ft-result-card
            className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5"
          >
            <ResultChart
              buckets={buckets}
              events={state.events}
              startAtZero={appearance.startGraphsAtZero}
            />
          </div>
        </div>

        <div
          data-ft-result-card
          className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-4 sm:p-5"
        >
          <ResultStat
            label={rawLabel}
            value={formatSpeed(burst ? burst.raw : raw, unit, decimals)}
          />
          <ResultStat label="Consistency" value={`${cons}%`} />
          <ResultStat label="Errors" value={wrongTotal} />
          <ResultStat label="Time" value={`${elapsedSec}s`} />
        </div>

        {/* Directly under the stats, so "Next test" stays above the fold
         *  whatever is switched on below. */}
        {preview ? null : (
          <ResultActions
            onNext={() => restart()}
            onReplay={() => setReplaying(true)}
            canReplay={state.events.length > 0}
            captureRef={captureRef}
            share={
              lastTestId
                ? { testId: lastTestId, handle: shareHandle, wpm }
                : null
            }
          />
        )}

        <RunAnalysis view={view} preview={preview} isNewPb={isNewPb} />

        {appearance.resultShowExtras ? (
          <ExtraStats
            events={state.events}
            words={state.words}
            typed={state.typed}
            committed={committed}
          />
        ) : null}

        {(appearance.resultShowPerLetter && view) || appearance.resultShowHandBalance ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {appearance.resultShowPerLetter && view ? (
              <PerLetterSlowness input={view.input} />
            ) : null}
            {appearance.resultShowHandBalance ? (
              <HandSplit
                events={state.events}
                view={view}
                keymapLayout={appearance.keymapLayout}
              />
            ) : null}
          </div>
        ) : null}

        {appearance.resultShowHeatmap && state.words.length > 0 ? (
          <InsightCard label="Text heatmap">
            <PassageHeatmap words={state.words} events={state.events} />
          </InsightCard>
        ) : null}
      </div>
    </div>
  );
}
