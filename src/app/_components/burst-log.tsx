"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BurstTry } from "./burst-stats";
import { usePractice } from "./practice-state";

/** Every try of the current BURST run, kept above <BurstProvider> so the
 *  results screen can still read it: BurstProvider unmounts the moment
 *  the run is done. Display only; bursts are never saved. */

type BurstLog = {
  tries: readonly BurstTry[];
  /** Append a try. `words` is the passage the try was typed on, so a
   *  try that closes as a new passage loads is dropped, not mixed in. */
  record: (t: BurstTry, words: readonly string[]) => void;
};

const BurstLogContext = createContext<BurstLog | null>(null);
const NO_TRIES: readonly BurstTry[] = [];

/** Mount once around the typing surface's body (rest, run and results).
 *  The log is tied to the passage: a restart or a mode/length change
 *  loads new words, which starts an empty log without an effect. */
export function BurstLogProvider({ children }: { children: ReactNode }) {
  const { state } = usePractice();
  const [log, setLog] = useState<{
    words: readonly string[];
    tries: readonly BurstTry[];
  }>(() => ({ words: state.words, tries: NO_TRIES }));

  // A try for other words than the logged ones starts a new log; one
  // that arrives for an old passage is never read (see `tries`).
  const record = useCallback((t: BurstTry, words: readonly string[]) => {
    setLog((prev) =>
      prev.words === words
        ? { words, tries: [...prev.tries, t] }
        : { words, tries: [t] },
    );
  }, []);

  const tries = log.words === state.words ? log.tries : NO_TRIES;
  const value = useMemo(() => ({ tries, record }), [tries, record]);
  return (
    <BurstLogContext.Provider value={value}>{children}</BurstLogContext.Provider>
  );
}

/** The current run's tries, or null outside a typing surface (the
 *  settings preview, the live-spectate clone). */
export function useBurstTries(): readonly BurstTry[] | null {
  return useContext(BurstLogContext)?.tries ?? null;
}

const noop = () => {};

/** Recorder for BurstProvider; a no-op when no log is mounted. */
export function useRecordBurstTry(): BurstLog["record"] {
  return useContext(BurstLogContext)?.record ?? noop;
}
