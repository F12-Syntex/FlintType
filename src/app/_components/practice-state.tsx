"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { recordWpmSample } from "@/lib/avg-wpm-cache";
import { DEFAULT_BEHAVIOUR, useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { loadQuotes, pickQuote, type QuoteGroup } from "@/lib/quotes";
import { useTypingSurfaceMarker } from "@/lib/typing-surface";
import { useAdapt } from "@/lib/use-adapt";
import { useIsMobile } from "@/lib/use-is-mobile";
import { isRaceInputCurrentlyLocked } from "@/lib/race-input";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { useWordlist } from "@/lib/wordlists/use-wordlist";
import { calcWpmAndRaw, countChars } from "@/lib/wpm";
import {
  avgWpm as computeAvgWpm,
  consistencyScore as computeConsistency,
  peakWpm as computePeakWpm,
  stallWpm as computeStallWpm,
} from "@/lib/wpm-stats";
import {
  adaptPool,
  decorate,
  defaultLengthFor,
  generateForMode,
  generateWords,
  initialState,
  quoteToWords,
  reducer,
  TIME_BUFFER,
  type Action,
  type KeyEvent,
  type Length,
  type Mode,
  type Phase,
  type State,
  type WordCfg,
  type WpmSample,
} from "./practice-reducer";
import { PracticeLiveBroadcast } from "./practice-live-broadcast";

// Re-export the practice-test types so existing consumers
// (`@/app/_components/practice-state` is imported in ~15 places) keep
// working without an import-path churn. The pure logic itself lives
// in `./practice-reducer`; this file owns the React-side Context,
// Provider, and hooks. Type re-exports are compile-time only — no
// runtime barrel.
export type {
  Action,
  KeyEvent,
  Length,
  Mode,
  Phase,
  State,
  WordCfg,
  WpmSample,
};

// Pure-value re-exports kept for the small set of consumers that
// already grew an external dependency on these symbols before the
// split. Each is just a forward to practice-reducer — the canonical
// import path for new code is `./practice-reducer`.
export {
  adaptPool,
  decorate,
  defaultLengthFor,
  generateWords,
  initialState,
  quoteToWords,
  reducer,
};


// ─── Context ────────────────────────────────────────────────────────

type PracticeCtx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  /** Action helpers that auto-bind the current behaviour-prefs cfg
   *  for word generation, kick the async quote fetch when the user
   *  switches into QUOTE mode, and handle per-mode defaults. */
  setMode: (mode: Mode) => void;
  setLength: (length: Length) => void;
  toggleAdapt: () => void;
  /** Swap the active wordlist. Persists to the practice slice, the
   *  next render's useWordlist fires the fetch (or hits cache), and
   *  the current passage gets re-rolled from the new pool. */
  setWordlist: (id: string) => void;
  /** Currently-selected wordlist id (read from the persisted slice). */
  wordlist: string;
  restart: () => void;
  elapsedMs: number;
  wpm: number;
  raw: number;
  accuracy: number;
  /** Per-second sample of (wpm, raw, t-since-first-keystroke). Cleared on
   *  every fresh run; populated by an interval while the test is running
   *  so the chart and any history view share the same data. */
  wpmHistory: readonly WpmSample[];
  /** True while an adaptive fetch is in flight and the user is sitting
   *  in a fresh rest passage. The Passage component reads this to swap
   *  the seeded local words for a skeleton — without it the user sees
   *  the seeded list flash for a few hundred ms, then jump to whatever
   *  the algorithm picked, which reads as lag. Always false when adapt
   *  is off, when in a drill (locked words), or once typing has begun. */
  adaptLoading: boolean;
  /** Number of times the sudden-death watcher has reset the run after
   *  a wrong keystroke. Surfaced so drill UIs can telegraph the cost
   *  of the restart streak. Always 0 when the provider is not in
   *  sudden-death mode. */
  suddenDeathRestarts: number;
  /** Server-minted id for the most recently submitted completed run,
   *  surfaced so the post-test summary can build a `/r/<id>` share
   *  link. `null` while a run is still in progress, or when the most
   *  recent submit failed (network / auth / 5xx). Reset every time a
   *  fresh run starts so a stale id from the previous run never leaks
   *  into the share affordance on the new run's results screen. */
  lastTestId: string | null;
  /** Server-authoritative personal-best verdict for the most recently
   *  submitted run: `true` when it beat the user's prior best for this
   *  (mode, length) bucket, `false` when it didn't, `null` while the
   *  submit is still in flight, failed, or the run wasn't submitted
   *  (anonymous viewer, BURST). The results screen reads this to gate
   *  the PB crown for signed-in users so it only fires on a real PB. */
  lastTestIsPb: boolean | null;
};

/** Exported so previews and other read-only consumers can mount their
 *  own provider that supplies a frozen state — see
 *  `_components/preview-practice.tsx`. The real provider is the only
 *  source of *live* practice state; previews just need to satisfy the
 *  context shape so real components (Passage, Readouts, …) mount
 *  unmodified. */
export const PracticeContext = createContext<PracticeCtx | null>(null);
const Ctx = PracticeContext;

export function usePractice(): PracticeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePractice must be used within <PracticeProvider>");
  return ctx;
}

/** Persisted slice — the user's mode / length / adapt / wordlist
 *  preferences, remembered across sessions via the user_prefs blob.
 *  The rest of the practice state (run-in-progress: phase, cursor,
 *  events…) is ephemeral and stays in the reducer. */
type PracticeSlice = {
  mode: Mode;
  length: Length;
  adapt: boolean;
  /** MonkeyType wordlist id (see src/data/wordlists/catalog.ts).
   *  Empty/missing → DEFAULT_WORDLIST. Stored as a free string so
   *  catalog refreshes (yarn wordlists:sync) don't widen the type
   *  surface here — validation lives in `isWordlistId`. */
  wordlist: string;
};
const DEFAULT_PRACTICE_SLICE: PracticeSlice = {
  mode: "WORDS",
  length: initialState.length,
  adapt: true,
  wordlist: "english",
};

export function PracticeProvider({
  children,
  lockedWords,
  suddenDeath = false,
  raceMode = false,
}: {
  children: React.ReactNode;
  /** When provided, the provider runs in "drill" mode: the passage is
   *  pinned to this word list, restart re-uses it instead of re-rolling
   *  random words, and the live-practice flows (slice mirroring,
   *  cfg-driven regeneration, adaptive prefetch) all short-circuit so
   *  the drill remains a single fixed exercise. */
  lockedWords?: readonly string[];
  /** Sudden-death drill mode. Forces stopOnError on every keystroke
   *  (so a wrong char never advances the cursor), then a watcher
   *  notices the wrong-event in the events log and dispatches RESTART
   *  to bounce the user back to word zero. Implies lockedWords —
   *  without a locked passage the restart would re-roll fresh
   *  random words on every miss, which is not the drill the
   *  caller asked for. */
  suddenDeath?: boolean;
  /** True when the provider's typing data is feeding a multiplayer
   *  race. Tags the submitted test row with `mode: "race"` so the
   *  history page can distinguish race runs from regular practice.
   *  The bigram / trigram / word adaptive models still update the
   *  same way — race typing is real typing and the user expects it
   *  to feed their weakness profile. */
  raceMode?: boolean;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    lockedWords,
    (lw): State =>
      lw && lw.length > 0
        ? { ...initialState, words: [...lw], length: lw.length, mode: "WORDS" }
        : initialState,
  );
  const lockedWordsRef = useRef(lockedWords);
  lockedWordsRef.current = lockedWords;
  const { prefs } = useBehaviourPrefs();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const adapt = useAdapt();
  const adaptRef = useRef(adapt);
  adaptRef.current = adapt;
  // Adaptive drilling is desktop-only. On a mobile viewport we expose
  // adapt as `false` to every consumer regardless of the user's stored
  // preference — so a desktop user who flipped it on doesn't carry the
  // setting onto their phone. The stored preference is preserved
  // unchanged; switching back to desktop restores the user's choice.
  const isMobile = useIsMobile();
  // Adaptive practice requires an account: the bigram / trigram /
  // word models are persisted server-side per Clerk userId, and the
  // /api/adapt routes sit behind requireAuth. Anonymous visitors get
  // the feature locked to off — the toggle in <AdaptControl> opens a
  // modal that prompts them to sign in. While Clerk loads we treat
  // the viewer as signed-out so first paint never hands them the
  // adaptive batch fetch (which would 401).
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const adaptAuthAllowed = userLoaded && isSignedIn === true;
  const {
    value: practiceSlice,
    update: updatePracticeSlice,
  } = useRemotePrefs("practice", DEFAULT_PRACTICE_SLICE);

  // Resolve the selected wordlist into its actual word array. Returns
  // null until the CDN fetch resolves (or instantly when the cache is
  // warm via in-memory / localStorage hits). While null, the reducer's
  // embedded English-200 stays the fallback so first paint is never
  // blank. Stash in a ref so generateForMode callsites read the latest
  // pool without needing the call sites threaded through extra deps.
  const { words: wordlistWords } = useWordlist(practiceSlice.wordlist);
  const wordPoolRef = useRef<readonly string[] | null>(wordlistWords);
  wordPoolRef.current = wordlistWords;

  // When the wordlist swap finishes loading (or the user picks a new
  // wordlist and the new pool resolves), re-roll the active passage —
  // but only when the run hasn't started yet. Mid-run swaps are
  // surfaced on the user's next restart instead so we don't yank the
  // passage out from under them.
  useEffect(() => {
    if (lockedWordsRef.current) return;
    if (wordlistWords == null) return;
    if (state.phase !== "rest") return;
    if (state.mode !== "WORDS" && state.mode !== "TIME") return;
    const cfg: WordCfg = {
      minWordLength: prefsRef.current.minWordLength,
      showSecondary: prefsRef.current.showSecondary,
      wordPool: wordlistWords,
    };
    dispatch({
      type: "SET_MODE",
      mode: state.mode,
      length: state.length,
      words: generateForMode(state.mode, state.length, cfg),
      quoteSource: null,
    });
    // Watching only the loaded pool identity — other deps would
    // cause this to re-fire on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordlistWords]);
  // Tracks whether we've already mirrored a given slice snapshot into
  // the reducer — prevents the "slice → dispatch → state → slice" loop
  // when the user flips a control: we cause the slice change ourselves
  // and don't want the effect to re-dispatch when our own write echoes
  // back.
  const lastAppliedSliceRef = useRef<string>("");

  // True while an adaptive fetch is in flight. Initial value reads
  // the cached slice synchronously so a returning user with adapt=true
  // gets the skeleton on first paint instead of the seeded local words
  // flashing then swapping when the fetch resolves. Locked-words drills
  // and non-WORDS modes never load adaptively.
  const [adaptLoading, setAdaptLoading] = useState<boolean>(() => {
    if (lockedWords && lockedWords.length > 0) return false;
    // Initial paint: don't show the adaptive skeleton when Clerk hasn't
    // confirmed a signed-in user yet — keeps the local fallback visible
    // for anonymous viewers instead of blanking the passage waiting on a
    // fetch that will never fire.
    if (!adaptAuthAllowed) return false;
    return practiceSlice.adapt && practiceSlice.mode === "WORDS";
  });

  // Sudden-death plumbing — see prop docs above. The ref form lets the
  // window-level keystroke handler force stopOnError without being
  // recreated whenever the prop flips.
  const suddenDeathRef = useRef(suddenDeath);
  suddenDeathRef.current = suddenDeath;
  const [suddenDeathRestarts, setSuddenDeathRestarts] = useState(0);
  // Reset the restart counter whenever the locked passage swaps so a
  // freshly-mounted drill doesn't inherit a stale tally.
  useEffect(() => {
    setSuddenDeathRestarts(0);
  }, [lockedWords]);
  // Watcher: every time the events log grows, peek at the newest event.
  // If it's a wrong-char attempt and we're in sudden-death mode,
  // bounce the run back to word zero by re-dispatching RESTART with
  // the locked passage. The dispatch fires synchronously inside the
  // effect — no setTimeout — so the user only ever sees the running
  // state, never an in-between frame with the wrong char accepted.
  const lastHandledEventLenRef = useRef(0);
  useEffect(() => {
    if (!suddenDeath) return;
    const len = state.events.length;
    if (len === 0) {
      lastHandledEventLenRef.current = 0;
      return;
    }
    if (len <= lastHandledEventLenRef.current) return;
    lastHandledEventLenRef.current = len;
    const last = state.events[len - 1];
    if (!last || last.correct) return;
    if (!lockedWordsRef.current) return;
    setSuddenDeathRestarts((n) => n + 1);
    dispatch({
      type: "RESTART",
      words: [...lockedWordsRef.current],
      quoteSource: null,
    });
    // RESTART clears events to []; the effect re-runs with len=0 and
    // resets the ref so the next miss is handled freshly.
  }, [state.events, suddenDeath]);

  // Mirror the persisted slice into the reducer whenever the slice
  // identity changes. The cache returns DEFAULT_PRACTICE_SLICE before
  // the GET resolves, so the *first* fire is harmless (state already
  // matches defaults); the *second* fire — once the cache loads —
  // restores the user's last mode / length / adapt picks. Subsequent
  // fires triggered by our own writes are short-circuited because
  // state already matches the slice.
  useEffect(() => {
    if (lockedWordsRef.current) return;
    const key = `${practiceSlice.mode}|${practiceSlice.length}|${practiceSlice.adapt}`;
    if (lastAppliedSliceRef.current === key) return;
    lastAppliedSliceRef.current = key;
    if (
      practiceSlice.mode !== state.mode ||
      practiceSlice.length !== state.length
    ) {
      const cfg = {
        minWordLength: prefsRef.current.minWordLength,
        showSecondary: prefsRef.current.showSecondary,
        wordPool: wordPoolRef.current ?? undefined,
      };
      dispatch({
        type: "SET_MODE",
        mode: practiceSlice.mode,
        length: practiceSlice.length,
        words: generateForMode(practiceSlice.mode, practiceSlice.length, cfg),
        quoteSource: null,
      });
    }
    if (practiceSlice.adapt !== state.adapt) {
      dispatch({ type: "TOGGLE_ADAPT" });
    }
    // Intentionally exclude state from deps — we only want to react to
    // slice changes, not to every keystroke that touches state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceSlice]);

  // Regenerate the passage when the word-shape prefs change so the
  // user sees the effect of min-word / show-secondary immediately
  // instead of after the next manual restart.
  const wordCfgKey = `${prefs.minWordLength}|${prefs.showSecondary}`;
  useEffect(() => {
    if (lockedWordsRef.current) return;
    dispatch({
      type: "REGENERATE",
      cfg: {
        minWordLength: prefs.minWordLength,
        showSecondary: prefs.showSecondary,
      },
    });
    // wordCfgKey covers every cfg field that influences the passage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordCfgKey]);

  // Live elapsed (ticks every 100ms while running).
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (state.phase !== "running" || state.startTime == null) {
      if (state.phase === "done" && state.startTime && state.endTime) {
        setElapsedMs(state.endTime - state.startTime);
      } else if (state.phase === "rest") {
        setElapsedMs(0);
      }
      return;
    }
    const id = setInterval(() => {
      setElapsedMs(Date.now() - (state.startTime ?? Date.now()));
    }, 100);
    return () => clearInterval(id);
  }, [state.phase, state.startTime, state.endTime]);

  // Per-second WPM sampling — same approach monkeytype uses to power its
  // chart. We read the latest typed[] / words via a ref so the interval
  // stays mounted across keystrokes (the array changes every key).
  const stateForSampleRef = useRef(state);
  stateForSampleRef.current = state;
  const [wpmHistory, setWpmHistory] = useState<WpmSample[]>([]);
  useEffect(() => {
    if (state.phase === "rest") {
      setWpmHistory([]);
      return;
    }
    if (state.phase !== "running" || state.startTime == null) return;
    const startTime = state.startTime;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const s = stateForSampleRef.current;
      if (s.startTime == null) return;
      const t = Date.now() - startTime;
      // Raw reflects every key pressed — pass the keystroke count so
      // stop-on-error / dropped extras don't sink it (see wpm.ts).
      const { wpm, raw } = calcWpmAndRaw(s.typed, s.words, t, false, s.events.length);
      setWpmHistory((prev) => [
        ...prev,
        {
          t,
          wpm: Math.round(wpm * 10) / 10,
          raw: Math.round(raw * 10) / 10,
        },
      ]);
    };
    // Schedule the first sample at the next 1s boundary so consecutive
    // samples land on whole-second ticks.
    const firstDelay = Math.max(50, 1000 - (Date.now() - startTime));
    timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 1000);
    }, firstDelay);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.phase, state.startTime]);

  // TIME mode countdown: end the run when the duration elapses. We let
  // setTimeout handle the wake-up so we don't poll Date.now() on every
  // keystroke; the elapsed-tick effect above stays purely cosmetic.
  useEffect(() => {
    if (
      state.mode !== "TIME" ||
      state.phase !== "running" ||
      state.startTime == null
    ) {
      return;
    }
    const remaining =
      state.length * 1000 - (Date.now() - state.startTime);
    const id = setTimeout(() => {
      dispatch({ type: "FINISH_TIME", now: Date.now() });
    }, Math.max(0, remaining));
    return () => clearTimeout(id);
  }, [state.mode, state.phase, state.startTime, state.length]);

  // Server-minted id for the most recent submitted run. Set when
  // `adapt.submit` resolves (so the share affordance can build a
  // /r/<id> link); cleared whenever the user leaves the "done" phase
  // (restart, new run) so an old id can't leak into a fresh result
  // screen.
  const [lastTestId, setLastTestId] = useState<string | null>(null);
  // PB verdict for the just-submitted run (see PracticeCtx.lastTestIsPb).
  // null until the submit resolves; reset whenever the user leaves the
  // done screen so a stale verdict can't crown the next run.
  const [lastTestIsPb, setLastTestIsPb] = useState<boolean | null>(null);
  useEffect(() => {
    if (state.phase !== "done") {
      setLastTestId(null);
      setLastTestIsPb(null);
    }
  }, [state.phase]);

  // Mirror wpmHistory in a ref so the submit effect can read the
  // up-to-the-moment value without subscribing to it (subscribing
  // would re-fire the effect every second and the lastSubmittedRef
  // guard would just no-op, but the wasted closure churn isn't
  // worth saving the ref).
  const wpmHistoryRef = useRef<readonly WpmSample[]>(wpmHistory);
  wpmHistoryRef.current = wpmHistory;

  // Submit completed runs to the adapt route. Fires once per
  // (startTime, endTime) tuple — guards against the effect re-running
  // when the user restarts (which keeps phase=done briefly).
  const lastSubmittedRef = useRef<string>("");
  useEffect(() => {
    if (state.phase !== "done") return;
    if (state.events.length === 0) return;
    const startTime = state.startTime;
    const endTime = state.endTime;
    if (startTime == null || endTime == null) return;
    const key = `${startTime}|${endTime}`;
    if (lastSubmittedRef.current === key) return;
    lastSubmittedRef.current = key;

    // BURST runs do not feed the adapt model and do not record a
    // test row (per the user's spec — BURST grants XP_PER_DRILL via
    // lifetimeStats.drillsCompleted instead, wired in BurstPractice).
    // Skip the submit + skip the avg-wpm sample (its own threshold
    // would otherwise feedback-loop).
    if (state.mode === "BURST") return;

    const { wpm, raw } = calcWpmAndRaw(
      state.typed,
      state.words,
      endTime - startTime,
      true,
      state.events.length,
    );
    // Feed the rolling-mean cache that backs BURST mode's auto-
    // threshold (behaviour.burstThreshold = 0). Pure localStorage,
    // capped to the last 20 samples; see src/lib/avg-wpm-cache.ts.
    recordWpmSample(wpm);
    const counts = countChars(state.typed, state.words, true);
    const correctChars = counts.allCorrectChars;
    const incorrectChars = counts.incorrectChars + counts.extraChars;
    const accuracy =
      correctChars + incorrectChars > 0
        ? (correctChars / (correctChars + incorrectChars)) * 100
        : 100;
    const wordsActuallyTyped = state.words.slice(
      0,
      Math.min(state.cursorWord + 1, state.words.length),
    );

    // Roll-up stats + per-second history, computed from the same
    // wpmHistory buffer the live <ResultChart> reads. Persisted so
    // the share image (and any future async render of the results
    // screen) can show the same numbers and chart shape the user
    // saw post-test, without storing keystroke timings.
    const history = wpmHistoryRef.current;
    const peakWpm = Math.round(computePeakWpm(history));
    const avgWpm = Math.round(computeAvgWpm(history));
    const stallWpm = Math.round(computeStallWpm(history));
    const consistency = computeConsistency(history);

    const adaptOn = state.adapt;
    const wordsMode = state.mode === "WORDS";
    const length = state.length;
    const submitMode = raceMode
      ? "race"
      : adaptOn
        ? "training"
        : "casual";
    void (async () => {
      const result = await adaptRef.current.submitTest({
        startedAt: startTime,
        completedAt: endTime,
        mode: submitMode,
        durationOrWordCount: length,
        wpm,
        accuracy,
        errorCount: state.errorWords.size,
        resetCount: 0,
        wasCompleted: true,
        words: wordsActuallyTyped,
        timings: state.events,
        rawWpm: raw,
        peakWpm,
        avgWpm,
        stallWpm,
        consistency,
        // Cap to the schema max (600). For runs ≤10min this is a
        // no-op; longer runs get the head-trimmed history, which
        // is fine — the chart cares about overall shape.
        wpmHistory: history.slice(-600).map((s) => ({
          t: s.t,
          wpm: s.wpm,
          raw: s.raw,
        })),
      });
      if (result) {
        setLastTestId(result.testId);
        setLastTestIsPb(result.isPersonalBest);
      }
      // submitTest cleared the queue (model just changed). Top up
      // immediately against the new snapshot so the user's next
      // restart finds a ready batch waiting — no network glitch.
      if (adaptOn && wordsMode) {
        const cfg = {
          minWordLength: prefsRef.current.minWordLength,
          showSecondary: prefsRef.current.showSecondary,
        };
        void adaptRef.current.refill(length, adaptPool(cfg));
      }
    })();
    // Intentionally watching only state.phase — every dependency listed
    // would re-fire the effect on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Initial-mount adaptive fetch: when the persisted adapt slice loads
  // back as `true` and we're sitting in a fresh rest passage, swap the
  // seeded local words for an algorithm-selected set. The skeleton is
  // shown for the duration of the fetch (adaptLoading toggles around
  // it); on cold-start / network failure we fall back to the seeded
  // local list and clear the loading flag so the user gets a usable
  // passage instead of an indefinite skeleton.
  useEffect(() => {
    if (lockedWordsRef.current) return;
    if (!practiceSlice.adapt || practiceSlice.mode !== "WORDS") {
      // Adapt off or in a non-WORDS mode — no fetch, no skeleton.
      setAdaptLoading(false);
      return;
    }
    if (!adaptAuthAllowed) {
      // Stored slice says adapt=true but no signed-in user — feature is
      // gated. Skip the fetch entirely (it would 401), keep the seeded
      // local words on screen, and clear any leftover skeleton.
      setAdaptLoading(false);
      return;
    }
    setAdaptLoading(true);
    const cfg = {
      minWordLength: prefsRef.current.minWordLength,
      showSecondary: prefsRef.current.showSecondary,
    };
    let cancelled = false;
    void (async () => {
      try {
        const pool = adaptPool(cfg);
        const words = await adaptRef.current.fetchWords(
          practiceSlice.length,
          pool,
        );
        if (cancelled) return;
        const cur = stateForSampleRef.current;
        if (cur.phase !== "rest") return;
        if (cur.cursorWord !== 0 || cur.cursorChar !== 0) return;
        if (words && words.length > 0) {
          dispatch({
            type: "RESTART",
            words: decorate(words, cfg, Date.now()),
            quoteSource: null,
          });
        }
        // No-op when words is null/empty — the seeded local list the
        // reducer already holds is the fallback the user will type
        // against. Clearing adaptLoading reveals it.
      } finally {
        if (!cancelled) setAdaptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceSlice, adaptAuthAllowed]);

  // Live-stat values exposed to the context (Readouts, the rest hint,
  // the mode bar). Throttled to 1 Hz during running — per-keystroke
  // updates were jittery and made the numbers hard to read; a 1-second
  // sampling cadence reads as steady. On `rest` they reset to zero/100;
  // on `done` they snap to the final per-keystroke value so the post-
  // test summary is exact, not stale-by-up-to-one-second. The actual
  // submission path (see the `phase === "done"` effect further down)
  // recomputes from state directly, so this throttle only affects
  // displayed numbers — never recorded ones.
  const [liveStats, setLiveStats] = useState<{
    wpm: number;
    raw: number;
    accuracy: number;
  }>({ wpm: 0, raw: 0, accuracy: 100 });

  const liveStateRef = useRef(state);
  liveStateRef.current = state;

  useEffect(() => {
    function compute(isFinal: boolean): {
      wpm: number;
      raw: number;
      accuracy: number;
    } {
      const s = liveStateRef.current;
      if (s.startTime == null) return { wpm: 0, raw: 0, accuracy: 100 };
      const t =
        isFinal && s.endTime != null ? s.endTime - s.startTime : Date.now() - s.startTime;
      const { wpm: rawWpm, raw: rawRaw } = calcWpmAndRaw(
        s.typed,
        s.words,
        t,
        isFinal,
        s.events.length,
      );
      const counts = countChars(s.typed, s.words, isFinal);
      const correct = counts.allCorrectChars;
      const incorrect = counts.incorrectChars + counts.extraChars;
      const acc =
        correct + incorrect > 0
          ? Math.round((correct / (correct + incorrect)) * 1000) / 10
          : 100;
      return {
        wpm: Math.round(rawWpm),
        raw: Math.round(rawRaw),
        accuracy: acc,
      };
    }

    if (state.phase === "rest") {
      setLiveStats({ wpm: 0, raw: 0, accuracy: 100 });
      return;
    }
    if (state.phase === "done") {
      // Snap to the exact final values so the post-test screen
      // doesn't show a stale-by-up-to-one-second sample.
      setLiveStats(compute(true));
      return;
    }
    // running — sample immediately then once per second.
    setLiveStats(compute(false));
    const id = setInterval(() => setLiveStats(compute(false)), 1000);
    return () => clearInterval(id);
  }, [state.phase, state.startTime, state.endTime]);

  const value = useMemo<PracticeCtx>(() => {
    const { wpm, raw, accuracy } = liveStats;
    const buildCfg = (): WordCfg => {
      const p = prefsRef.current;
      return {
        minWordLength: p.minWordLength,
        showSecondary: p.showSecondary,
        // Pool sourced from the user's selected wordlist — see
        // useWordlist call above. Null while a fresh fetch is in
        // flight; the reducer falls back to its embedded English
        // pool in that case so first paint never blanks.
        wordPool: wordPoolRef.current ?? undefined,
      };
    };
    const loadAndDispatchQuote = async (group: QuoteGroup) => {
      try {
        const all = await loadQuotes();
        const q = pickQuote(all, group);
        dispatch({
          type: "SET_QUOTE",
          words: quoteToWords(q.text),
          source: q.source,
        });
      } catch {
        // Network or parse failure — fall back to a generated passage so
        // the user is never stuck staring at an empty screen.
        dispatch({
          type: "SET_QUOTE",
          words: generateWords(50, Date.now(), buildCfg()),
          source: "(quote unavailable)",
        });
      }
    };
    /** Fire-and-forget adaptive word fetch. The seeded local list the
     *  caller dispatched moments earlier is the fallback the user will
     *  type against if the fetch fails or returns nothing — but we
     *  still flip `adaptLoading` so the passage shows a skeleton
     *  instead of those local words flashing for the duration of the
     *  network round-trip. Drops the result silently if the user
     *  started typing before it landed. */
    const loadAndDispatchAdaptive = async (
      count: number,
      cfg: WordCfg,
    ) => {
      setAdaptLoading(true);
      try {
        const pool = adaptPool(cfg);
        const words = await adaptRef.current.fetchWords(count, pool);
        const cur = stateForSampleRef.current;
        // Only swap if the user hasn't started typing yet — replacing
        // mid-test would erase their progress and wipe their events.
        if (cur.phase !== "rest") return;
        if (cur.cursorWord !== 0 || cur.cursorChar !== 0) return;
        if (words && words.length > 0) {
          dispatch({
            type: "RESTART",
            words: decorate(words, cfg, Date.now()),
            quoteSource: null,
          });
        }
        // Cold-start / failure / null — leave the local fallback in
        // place; the finally block reveals it.
      } finally {
        setAdaptLoading(false);
      }
    };
    // Effective state — see comments on `isMobile` and
    // `adaptAuthAllowed` declarations above. Stored preference
    // (state.adapt) is unchanged; only the value exposed to consumers
    // flips off when on a phone-sized viewport OR when Clerk reports
    // no signed-in user. Both gates are independent — either one
    // forces adapt=false; both must clear for the feature to engage.
    const adaptDisabled = isMobile || !adaptAuthAllowed;
    const effectiveState = adaptDisabled && state.adapt
      ? { ...state, adapt: false }
      : state;
    return {
      state: effectiveState,
      dispatch,
      elapsedMs,
      wpm,
      raw,
      accuracy,
      wpmHistory,
      adaptLoading: effectiveState.adapt && adaptLoading && state.phase === "rest",
      suddenDeathRestarts,
      lastTestId,
      lastTestIsPb,
      setMode: (mode) => {
        const length = defaultLengthFor(mode);
        const cfg = buildCfg();
        dispatch({
          type: "SET_MODE",
          mode,
          length,
          words: generateForMode(mode, length, cfg),
          quoteSource: null,
        });
        // Persist the user's pick so the next visit lands here too.
        // Mark it as already-applied so the slice→state effect skips
        // the echo and doesn't redispatch / regenerate words again.
        lastAppliedSliceRef.current = `${mode}|${length}|${state.adapt}`;
        updatePracticeSlice({ mode, length });
        if (mode === "QUOTE") void loadAndDispatchQuote(length as QuoteGroup);
        else if (mode === "WORDS" && effectiveState.adapt) {
          void loadAndDispatchAdaptive(length, cfg);
        }
      },
      setLength: (length) => {
        const cfg = buildCfg();
        dispatch({
          type: "SET_LENGTH",
          length,
          words: generateForMode(state.mode, length, cfg),
          quoteSource: state.mode === "QUOTE" ? null : state.quoteSource,
        });
        lastAppliedSliceRef.current = `${state.mode}|${length}|${state.adapt}`;
        updatePracticeSlice({ length });
        if (state.mode === "QUOTE") {
          void loadAndDispatchQuote(length as QuoteGroup);
        } else if (state.mode === "WORDS" && effectiveState.adapt) {
          void loadAndDispatchAdaptive(length, cfg);
        }
      },
      toggleAdapt: () => {
        // Anonymous viewers can't enable adapt — the route stack is
        // gated by requireAuth and there's no userId to key the model
        // against. The <AdaptControl> button still opens the modal so
        // the user can read the explainer + sign-in CTA, but the
        // toggle itself is a no-op until they're authed.
        if (!adaptAuthAllowed) return;
        dispatch({ type: "TOGGLE_ADAPT" });
        const next = !state.adapt;
        lastAppliedSliceRef.current = `${state.mode}|${state.length}|${next}`;
        updatePracticeSlice({ adapt: next });
      },
      wordlist: practiceSlice.wordlist,
      setWordlist: (id: string) => {
        if (id === practiceSlice.wordlist) return;
        updatePracticeSlice({ wordlist: id });
        // No immediate re-roll here — useWordlist's effect will fire
        // when practiceSlice.wordlist changes, wordPoolRef updates
        // when its words resolve, and the user's next restart (Esc
        // or palette → "Restart test") picks up the new pool. Doing
        // a synchronous dispatch with stale wordPoolRef.current
        // would re-roll against the previous wordlist's pool.
      },
      restart: () => {
        const cfg = buildCfg();
        // Drill mode: re-use the same locked words so each restart is
        // an honest second go at the same exercise.
        if (lockedWordsRef.current) {
          dispatch({
            type: "RESTART",
            words: [...lockedWordsRef.current],
            quoteSource: null,
          });
          return;
        }
        if (state.mode === "QUOTE") {
          // Reset the run; new quote arrives when the fetch resolves.
          dispatch({
            type: "RESTART",
            words: [],
            quoteSource: null,
          });
          void loadAndDispatchQuote(state.length as QuoteGroup);
          return;
        }
        dispatch({
          type: "RESTART",
          words: generateForMode(state.mode, state.length, cfg),
          quoteSource: null,
        });
        if (state.mode === "WORDS" && effectiveState.adapt) {
          void loadAndDispatchAdaptive(state.length, cfg);
        }
      },
    };
  }, [state, elapsedMs, wpmHistory, liveStats, isMobile, adaptAuthAllowed, adaptLoading, suddenDeathRestarts, lastTestId, lastTestIsPb]);

  // Flag the global `F` focus-mode shortcut to stand down while a run
  // is in progress (rest or running) — keystrokes here are typed
  // characters, not chrome toggles. Released at "done" so `F` works
  // again on the results screen. See @/lib/typing-surface.
  useTypingSurfaceMarker(state.phase !== "done");

  // Keyboard listener — only when user isn't typing into another input.
  const stateRef = useRef(state);
  stateRef.current = state;
  const restartRef = useRef(value.restart);
  restartRef.current = value.restart;

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    // Only Backspace is allowed to ride a modifier — Ctrl / Alt(Win)
    // / ⌥(Mac) / ⌘(Mac) + Backspace = "delete word". Every other
    // modified shortcut (Ctrl+R, Cmd+T, …) falls through to the
    // browser. Mirrors the same gate in `input-capture.tsx`; both
    // listeners need it because focus can be on either the hidden
    // input or the wider page.
    const wordWise =
      e.key === "Backspace" && (e.ctrlKey || e.altKey || e.metaKey);
    if (!wordWise && (e.ctrlKey || e.metaKey || e.altKey)) return;

    // Tab-as-restart was retired — the command palette (Cmd+K →
    // "Restart test") owns restart now. See ft:practice:restart
    // listener further down. Tab here falls through to the browser's
    // native focus-shift behaviour, which is what users press it for
    // when they're not in the test.

    // Suppress typing while a modal owns the screen — the modal opens
    // by clicking a button which moves focus off the hidden input, so
    // the input's own onKeyDown stops firing and keystrokes bubble
    // here instead.
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      return;
    }
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.tagName === "SELECT")
    ) {
      return;
    }

    const s = stateRef.current;
    const p = prefsRef.current;
    if (e.key === "Escape") {
      restartRef.current();
      return;
    }
    if (s.phase === "done") return;
    // Race countdown / lobby / matching — block typing keys until the
    // race starts (Escape above still works). The race provider sets
    // this lock; single-player never does, so this is a no-op there.
    if (isRaceInputCurrentlyLocked()) return;

    if (e.key === " ") {
      e.preventDefault();
      if (s.phase === "rest") return;
      dispatch({ type: "SPACE", now: Date.now(), strictSpace: p.strictSpace });
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      // Confidence: off = allow always; word = block jumping past word
      // start; all = block backspace entirely.
      if (p.confidence === "all") return;
      if (p.confidence === "word" && s.cursorChar === 0) return;
      dispatch({ type: wordWise ? "BACKSPACE_WORD" : "BACKSPACE" });
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      dispatch({
        type: "TYPE_CHAR",
        char: e.key,
        now: Date.now(),
        // In sudden-death the cursor must never advance on a wrong
        // char — the watcher will see the wrong event and reset, but
        // until that effect fires we don't want a half-typed letter
        // peeking into the run. Force stopOnError on regardless of
        // the user's behaviour pref.
        stopOnError: p.stopOnError || suddenDeathRef.current,
        allowExtras: p.allowExtras,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // Tab → restart. ONE handler, capture phase, no gates. Runs while
  // the practice surface is mounted; for everything else (every
  // settings page, leaderboard, profile, race screens, etc.) the
  // PracticeProvider isn't mounted and this listener isn't attached,
  // so Tab does its native focus-shift there.
  //
  // The only escape hatch is the command palette: its onKeyDownCapture
  // on DialogContent runs at the target before this listener fires for
  // its descendants, so Tab inside the palette is safely consumed by
  // the palette itself and never reaches here.
  //
  // capture=true makes us run before any element listener (the input's
  // own onKeyDown, etc.) and before any focus-trap. stopImmediate-
  // Propagation kills the event so nothing downstream double-fires.
  useEffect(() => {
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      restartRef.current();
    }
    window.addEventListener("keydown", onTab, true);
    return () => window.removeEventListener("keydown", onTab, true);
  }, []);

  // Cross-component restart channel. The command palette's "Restart
  // test" entry dispatches this event; the practice surface
  // subscribes here and runs restart() on receipt. Kept as a second
  // path so the palette command works even when the user opens it
  // from a non-test surface (where the Tab listener above isn't
  // attached). Esc inside the test (input-capture.tsx) still
  // restarts as a fast in-test path.
  useEffect(() => {
    const onRestart = () => restartRef.current();
    window.addEventListener("ft:practice:restart", onRestart);
    return () => window.removeEventListener("ft:practice:restart", onRestart);
  }, []);

  return (
    <Ctx.Provider value={value}>
      {/* Streams this run to mutual friends when the user has opted in
       *  (invisible, gated server-side). Off during races — the race
       *  subsystem owns its own broadcast. */}
      <PracticeLiveBroadcast
        active={!raceMode}
        state={value.state}
        wpm={value.wpm}
        raw={value.raw}
        accuracy={value.accuracy}
        elapsedMs={value.elapsedMs}
        wpmHistory={value.wpmHistory}
      />
      {children}
    </Ctx.Provider>
  );
}
