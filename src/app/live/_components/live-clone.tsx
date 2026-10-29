"use client";

import { useMemo, type CSSProperties } from "react";
import {
  DEFAULT_APPEARANCE,
  type AppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  DEFAULT_BEHAVIOUR,
  type BehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { DEFAULT_CARET, type CaretSettings } from "@/lib/caret-settings";
import { PrefsOverrideProvider } from "@/lib/prefs-override";
import type { LiveScreen } from "@/types/live";
import { BurstResultProvider } from "@/app/_components/burst-log";
import { ModeBar } from "@/app/_components/mode-bar";
import { Passage } from "@/app/_components/passage";
import { PracticeContext, type WpmSample } from "@/app/_components/practice-state";
import { Readouts } from "@/app/_components/readouts";
import { TestSummary } from "@/app/_components/test-summary";
import { cloneAnalysisSource } from "./clone-source";
import { cloneState } from "./clone-state";

/** A faithful clone of the broadcaster's whole practice screen — the
 *  real `<ModeBar>` + `<Readouts>` + `<Passage>` while typing, and the
 *  real `<TestSummary>` on the results screen, mounted against a frozen
 *  practice state rebuilt from the live snapshot and wrapped in the
 *  broadcaster's appearance/caret/behaviour (`<PrefsOverrideProvider>`)
 *  + their resolved theme CSS vars. What they see is what the spectator
 *  sees — no forked rendering (ui-law §17.6); a BURST run's results
 *  figures arrive precomputed on the done frame (`screen.burst`), since
 *  the broadcaster's try log never leaves their tab. The whole surface is
 *  `pointer-events-none`: it's a view, not controls. */
export function LiveClone({
  words,
  screen,
  wpm,
  accuracy,
}: {
  words: string[];
  screen: LiveScreen;
  wpm: number;
  accuracy: number;
}) {
  const value = useMemo(() => {
    // One clock read, so a done run's length is exactly elapsedMs.
    const state = cloneState(words, screen, Date.now());
    return {
      state,
      dispatch: () => {},
      setMode: () => {},
      setLength: () => {},
      toggleAdapt: () => {},
      setWordlist: () => {},
      wordlist: "english",
      restart: () => {},
      elapsedMs: screen.elapsedMs,
      wpm,
      raw: screen.raw,
      accuracy,
      wpmHistory: (screen.wpmHistory ?? []) as WpmSample[],
      adaptLoading: false,
      suddenDeathRestarts: 0,
      lastTestId: null,
      lastTestIsPb: null,
    };
  }, [words, screen, wpm, accuracy]);

  const override = useMemo(
    () => ({
      appearance: {
        ...DEFAULT_APPEARANCE,
        ...(screen.appearance as Partial<AppearancePrefs>),
      },
      caret: { ...DEFAULT_CARET, ...(screen.caret as Partial<CaretSettings>) },
      behaviour: {
        ...DEFAULT_BEHAVIOUR,
        ...(screen.behaviour as Partial<BehaviourPrefs>),
      },
    }),
    [screen],
  );

  // The broadcaster's run analysed with their settings (clone-source.ts).
  // Keyed on what the analysis reads, not on each poll's fresh `screen`,
  // so a watched results screen is analysed once, not on every push.
  const b = override.behaviour;
  const sourceKey =
    value.state.phase === "done"
      ? [screen.elapsedMs, value.state.events.length, value.state.events.at(-1)?.t, screen.windowStart,
          b.stopOnError, b.allowExtras, b.strictSpace, b.confidence, screen.mode, screen.length,
          screen.adapt, words.join(" "), screen.typed.join(" ")].join("|")
      : "";
  const runAnalysisSource = useMemo(
    () =>
      sourceKey
        ? cloneAnalysisSource({ state: value.state, behaviour: b, wordlist: value.wordlist, windowStart: screen.windowStart })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey],
  );
  const ctxValue = useMemo(() => ({ ...value, runAnalysisSource }), [value, runAnalysisSource]);

  const done = value.state.phase === "done";

  return (
    <PrefsOverrideProvider value={override}>
      <div
        // The broadcaster's resolved theme vars cascade to the real
        // components inside, so colours + fonts match their screen.
        // pointer-events-none: this is a spectator view, not controls.
        // Full-bleed: fills the entire body under the header and lays out
        // exactly like the real practice surface — it IS their screen, not
        // a framed card.
        style={screen.themeVars as CSSProperties}
        className="pointer-events-none flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      >
        <PracticeContext.Provider value={ctxValue}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-3 pt-4 sm:gap-5 sm:px-12 sm:py-6 lg:px-20">
            <ModeBar />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {done ? (
                screen.burst ? (
                  // A BURST run's figures come from the broadcaster's try
                  // log, which the clone has no copy of: the done frame
                  // carries them precomputed.
                  <BurstResultProvider value={screen.burst}>
                    <TestSummary preview />
                  </BurstResultProvider>
                ) : (
                  <TestSummary preview />
                )
              ) : (
                <>
                  <div className="mb-4 hidden md:block">
                    <Readouts />
                  </div>
                  <Passage />
                </>
              )}
            </div>
          </div>
        </PracticeContext.Provider>
      </div>
    </PrefsOverrideProvider>
  );
}
