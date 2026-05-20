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
import { ModeBar } from "@/app/_components/mode-bar";
import { Passage } from "@/app/_components/passage";
import {
  PracticeContext,
  type KeyEvent,
  type Phase,
  type State,
  type WpmSample,
} from "@/app/_components/practice-state";
import { Readouts } from "@/app/_components/readouts";
import { TestSummary } from "@/app/_components/test-summary";

/** A faithful clone of the broadcaster's whole practice screen — the
 *  real `<ModeBar>` + `<Readouts>` + `<Passage>` while typing, and the
 *  real `<TestSummary>` on the results screen, mounted against a frozen
 *  practice state rebuilt from the live snapshot and wrapped in the
 *  broadcaster's appearance/caret/behaviour (`<PrefsOverrideProvider>`)
 *  + their resolved theme CSS vars. What they see is what the spectator
 *  sees — no forked rendering (ui-law §17.6). The whole surface is
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
    const typed = screen.typed;
    const phase = (screen.phase as Phase) ?? "running";
    const cursorWord = Math.min(Math.max(0, screen.cursorWord), words.length);
    const errorWords = new Set<number>();
    let totalChars = 0;
    let correctChars = 0;
    for (let i = 0; i < typed.length; i++) {
      const t = typed[i] ?? "";
      const w = words[i] ?? "";
      for (let c = 0; c < t.length; c++) {
        totalChars += 1;
        if (t[c] === w[c]) correctChars += 1;
      }
      if (i < cursorWord && t !== w) errorWords.add(i);
    }
    const events = (screen.events ?? []) as KeyEvent[];
    const state: State = {
      mode: screen.mode as State["mode"],
      length: screen.length as State["length"],
      adapt: false,
      phase,
      words: [...words],
      cursorWord: phase === "done" ? words.length : cursorWord,
      cursorChar: phase === "done" ? 0 : screen.cursorChar,
      errorWords,
      totalChars,
      correctChars,
      startTime: Date.now() - screen.elapsedMs,
      endTime: phase === "done" ? Date.now() : null,
      events,
      typed: [...typed],
      quoteSource: screen.quoteSource,
    };
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
        <PracticeContext.Provider value={value}>
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-3 pt-4 sm:gap-5 sm:px-12 sm:py-6 lg:px-20">
            <ModeBar />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {done ? (
                <TestSummary preview />
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
