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
import { Passage } from "@/app/_components/passage";
import { PracticeContext, type State } from "@/app/_components/practice-state";
import { Readouts } from "@/app/_components/readouts";

const NO_HISTORY: never[] = [];

/** A faithful clone of the broadcaster's practice screen: the real
 *  `<Readouts>` + `<Passage>` mounted against a frozen practice state
 *  rebuilt from the live snapshot, wrapped in the broadcaster's
 *  appearance/caret/behaviour (via `<PrefsOverrideProvider>`) and their
 *  resolved theme CSS vars (on the container). What they see is what the
 *  spectator sees — no forked rendering. */
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
    const state: State = {
      mode: screen.mode as State["mode"],
      length: words.length as State["length"],
      adapt: false,
      phase: "running",
      words: [...words],
      cursorWord,
      cursorChar: screen.cursorChar,
      errorWords,
      totalChars,
      correctChars,
      startTime: Date.now() - screen.elapsedMs,
      endTime: null,
      events: [],
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
      wpmHistory: NO_HISTORY,
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

  return (
    <PrefsOverrideProvider value={override}>
      <div
        // The broadcaster's resolved theme vars cascade to the real
        // components inside, so colours + fonts match their screen.
        style={screen.themeVars as CSSProperties}
        className="overflow-hidden rounded-md border border-border bg-background"
      >
        <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
          <PracticeContext.Provider value={value}>
            <div className="hidden md:block">
              <Readouts />
            </div>
            <Passage />
          </PracticeContext.Provider>
        </div>
      </div>
    </PrefsOverrideProvider>
  );
}
