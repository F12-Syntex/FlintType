"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { recordIfPb } from "@/lib/pb-cache";
import { formatSpeed } from "@/lib/speed-unit";
import { cn } from "@/lib/utils";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { calcWpmAndRaw, keystrokeErrors } from "@/lib/wpm";
import { consistencyScore, stallWpm } from "@/lib/wpm-stats";
import { PassageHeatmap } from "./passage-heatmap";
import { PbConfetti, PbCrown } from "./pb-celebration";
import { usePractice } from "./practice-state";
import { ResultActions } from "./result-actions";
import { type Bucket, ResultChart } from "./result-chart";
import { InsightCard } from "./insight-card";
import { HandBalance, PerLetterSlowness } from "./result-insights";
import { ExtraStats } from "./result-run-shape";
import { ReplayView } from "./result-replay";

// ─── Pieces ────────────────────────────────────────────────────────

/** Hero size steps down as the value grows ("271.0", "17760.0" with the
 *  decimal pref or the cpm / wph units) so value + PB crown always fit
 *  the headline column instead of running into the chart card. */
function heroSize(value: string): string {
  if (value.length <= 3) return "text-6xl sm:text-7xl";
  if (value.length <= 5) return "text-5xl sm:text-6xl";
  return "text-4xl sm:text-5xl";
}

/** One result number with its label above. Three tiers so the screen
 *  has one obvious answer: `hero` (speed, huge, primary), `lead`
 *  (accuracy, large ink) and `detail` (the secondary row, ink).
 *
 *  `subgrid` lets the mobile headline row share two grid rows across
 *  stats (labels in row 1, values bottom-aligned in row 2) so the
 *  labels line up even though the values differ in size; from sm the
 *  stat is a plain stack again. */
function ResultStat({
  label,
  value,
  suffix,
  tier = "detail",
  pb = false,
  subgrid = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  tier?: "hero" | "lead" | "detail";
  /** Paint the PB crown + confetti burst beside the value. */
  pb?: boolean;
  subgrid?: boolean;
}) {
  const text = String(value);
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5",
        subgrid && "row-span-2 grid grid-rows-subgrid sm:flex",
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "relative inline-flex items-baseline gap-1 whitespace-nowrap leading-none tabular-nums",
          subgrid && "self-end sm:self-start",
          tier === "hero" &&
            cn("font-bold tracking-[-0.04em] text-primary", heroSize(text)),
          tier === "lead" &&
            "text-4xl font-semibold tracking-[-0.03em] text-foreground sm:text-5xl",
          tier === "detail" &&
            "text-xl font-semibold tracking-tight text-foreground sm:text-2xl",
        )}
      >
        {text}
        {suffix ? (
          <span className="text-sm font-normal tracking-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        {pb ? <PbCrown /> : null}
        {pb ? <PbConfetti /> : null}
      </span>
    </div>
  );
}

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

function testTypeLabel(mode: string, length: number): string {
  if (mode === "TIME") return `Time ${length}s`;
  if (mode === "QUOTE") return "Quote";
  if (mode === "BURST") return `Burst ${length}`;
  return `Words ${length}`;
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

  // Per-second chart buckets from the live wpmHistory samples.
  const buckets = useMemo<Bucket[]>(
    () =>
      wpmHistory.map((s) => ({
        sec: Math.max(1, Math.round(s.t / 1000)),
        wpm: s.wpm,
        raw: s.raw,
      })),
    [wpmHistory],
  );
  const slowest = Math.round(stallWpm(buckets));
  const cons = consistencyScore(buckets);
  // Keystroke-true error count: the SAME metric the live readout and
  // the recorded run use (incorrect keystrokes, including corrected ones).
  const wrongTotal = keystrokeErrors(state.events);
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  const unit = appearance.typingSpeedUnit;
  const decimals = appearance.alwaysShowDecimal;
  const testType = [
    testTypeLabel(state.mode, state.length),
    state.mode === "QUOTE" ? null : wordlistLabel(wordlist),
  ]
    .filter(Boolean)
    .join(" · ");

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

  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-y-auto py-3 sm:py-6">
      {/* my-auto centres the report when it fits; once it overflows the
       *  auto margin collapses and the column scrolls naturally. */}
      <div
        ref={captureRef}
        className="my-auto flex w-full flex-col gap-4 sm:gap-6"
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
              label={unit.toUpperCase()}
              value={formatSpeed(wpm, unit, decimals)}
              pb={isNewPb}
              subgrid
            />
            <ResultStat tier="lead" label="Accuracy" value={accValue} subgrid />
            {/* Phones already show this in the settings pill above. */}
            <p className="hidden text-sm text-muted-foreground sm:block">
              {testType}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
            <ResultChart
              buckets={buckets}
              events={state.events}
              startAtZero={appearance.startGraphsAtZero}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-4 sm:p-5">
          <ResultStat label="Raw" value={formatSpeed(raw, unit, decimals)} />
          <ResultStat label="Consistency" value={`${cons}%`} />
          <ResultStat label="Errors" value={wrongTotal} />
          <ResultStat label="Time" value={`${elapsedSec}s`} />
        </div>

        {appearance.resultShowExtras ? (
          <ExtraStats
            events={state.events}
            totalWords={state.words.length}
            slowest={slowest}
            unitLabel={unit}
          />
        ) : null}

        {appearance.resultShowPerLetter || appearance.resultShowHandBalance ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {appearance.resultShowPerLetter ? (
              <PerLetterSlowness events={state.events} />
            ) : null}
            {appearance.resultShowHandBalance ? (
              <HandBalance events={state.events} />
            ) : null}
          </div>
        ) : null}

        {appearance.resultShowHeatmap && state.words.length > 0 ? (
          <InsightCard label="Passage heatmap" meta="Fast to slow · hover for ms">
            <PassageHeatmap words={state.words} events={state.events} />
          </InsightCard>
        ) : null}

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
      </div>
    </div>
  );
}
