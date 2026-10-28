"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { burstResult, type BurstResult, type BurstTry } from "./burst-stats";
import { appendBurstTry, burstTriesFor, NO_TRIES } from "./burst-tries";
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

/** Mount once around the typing surface's body (rest, run and results).
 *  The log is tied to the passage: a restart or a mode/length change
 *  loads new words, which starts an empty log without an effect. Tries
 *  also go to the per-passage store (burst-tries.ts), which the live
 *  broadcaster reads to send a finished run's figures to spectators. */
export function BurstLogProvider({ children }: { children: ReactNode }) {
  const { state } = usePractice();
  const [log, setLog] = useState<{
    words: readonly string[];
    tries: readonly BurstTry[];
  }>(() => ({ words: state.words, tries: burstTriesFor(state.words) }));

  // The store keeps one log per passage, so a try for other words than
  // the logged ones starts (or continues) that passage's own log; one
  // that arrives for an old passage is never read (see `tries`).
  const record = useCallback((t: BurstTry, words: readonly string[]) => {
    setLog({ words, tries: appendBurstTry(words, t) });
  }, []);

  const tries = log.words === state.words ? log.tries : NO_TRIES;
  const value = useMemo(() => ({ tries, record }), [tries, record]);
  return (
    <BurstLogContext.Provider value={value}>{children}</BurstLogContext.Provider>
  );
}

const noop = () => {};

/** Recorder for BurstProvider; a no-op when no log is mounted. */
export function useRecordBurstTry(): BurstLog["record"] {
  return useContext(BurstLogContext)?.record ?? noop;
}

const BurstResultContext = createContext<BurstResult | null>(null);

/** Hands the results screen a finished burst run's figures directly, for
 *  a surface with no try log of its own: the live-spectate clone shows
 *  the broadcaster's figures through it. */
export function BurstResultProvider({
  value,
  children,
}: {
  value: BurstResult;
  children: ReactNode;
}) {
  return (
    <BurstResultContext.Provider value={value}>
      {children}
    </BurstResultContext.Provider>
  );
}

/** The burst figures for the results screen: the ones a
 *  <BurstResultProvider> hands down, else rolled up from the current
 *  run's try log. Null while no try has cleared, and on a surface with
 *  neither (the settings preview), which keeps the regular figures. */
export function useBurstResult(): BurstResult | null {
  const given = useContext(BurstResultContext);
  const tries = useContext(BurstLogContext)?.tries ?? null;
  const own = useMemo(() => (tries ? burstResult(tries) : null), [tries]);
  return given ?? own;
}
