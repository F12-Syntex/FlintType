import type { FingerId } from "@/lib/hand-layout";
import type { EditTiming, KeystrokeTimingV2, RunContext, SpaceTiming } from "./capture";

/** Types of the per-test typing analysis (src/lib/typing-analysis/) and
 *  its stored digest. The capture types (KeystrokeTimingV2, EditTiming,
 *  SpaceTiming, RunContext) live in ./capture. */

export type RunLengthMode = "words" | "time" | "quote";
export type FixMode = "fix" | "block" | "none";
export type InputKind = "keyboard" | "touch" | "mixed";

/** Everything the engine needs. The client builds it with
 *  stateToRunInput (src/app/_components/practice-submit.ts); the server
 *  builds it with submitToRunInput. */
export type RunInput = {
  timings: readonly KeystrokeTimingV2[];
  edits?: readonly EditTiming[];
  spaces?: readonly SpaceTiming[];
  /** Exactly the words the submit sends: reachedWords(state), spec-20 §5.2
   *  (today's slice: words up to cursorWord + 1). Both builders use it (I2). */
  words: readonly string[];
  /** Final per-word typed buffers (client only). v2 ignores it and
   *  uses the replay; v1 uses it for exact lost characters. */
  typedFinal?: readonly string[];
  durationMs: number;          // T = endTime − startTime (Date.now clock)
  wpm: number;                 // the run's counted net wpm (calcWpmAndRaw final)
  lengthMode: RunLengthMode;
  ctx?: RunContext;
  /** The events don't cover the whole run: the live clone's word window
   *  started after word 0 (spec-50 §8). Forces quality.partial. */
  partial?: boolean;
};

export type SliceKey = "typing" | "fixing" | "before" | "inside" | "breaks";
export type FrictionKey = "fixing" | "before" | "inside";
export const SLICE_ORDER: readonly SliceKey[] = ["typing", "fixing", "before", "inside", "breaks"];
export const FRICTION_ORDER: readonly FrictionKey[] = ["fixing", "before", "inside"];
/** ms per slice for one test, or seconds per minute when pooled. */
export type SliceSet = Record<SliceKey, number>;

export type GapClass = "cross" | "hand" | "finger" | "repeat" | "shift" | "other" | "plain";
/** [n, Σ ln x, Σ (ln x)²]; x in ms (or a ratio, where stated). */
export type LogCell = [n: number, sumLog: number, sumLogSq: number];

export type RunQuality = {
  capture: 1 | 2;
  replayOk: boolean;           // v2 replay agreed with the recorded pos (always true for v1)
  pace: "good" | "rough" | "none";
  quantised: boolean;          // coarse clock: catches suppressed, cells omitted
  clockOk: boolean;            // reconciliation stayed small
  partial: boolean;            // the events don't cover the run (live clone windowing or cap)
  qwerty: boolean;             // QWERTY gap classes and finger cells were used (codeMatch rule, §4.1)
};

export type Finding =
  | { kind: "fixing"; impactMs: number; ms: number; count: number; worstWord: string | null; noticedLate: number | null }
  | { kind: "left"; impactMs: number; count: number; lostWpm: number; canFix: boolean }
  | { kind: "before"; impactMs: number; ms: number; count: number; longest: { ms: number; word: string } | null; longWords: boolean }
  | { kind: "inside"; impactMs: number; ms: number; count: number; topWord: string | null }
  | { kind: "breaks"; impactMs: number; ms: number; count: number }
  | { kind: "fade"; impactMs: number; fromWpm: number; toWpm: number; lastSeconds: number }
  | { kind: "startUp"; impactMs: number; words: number; ms: number }
  | { kind: "even"; impactMs: 0; mistakes: number }
  | { kind: "short"; impactMs: 0 }
  | { kind: "clock"; impactMs: 0 };

export type AnalysisCells = {
  /** ln(ds) of fluent (non-catch) clean in-word gaps by class. QWERTY keyboard only, else {}. */
  cls: Partial<Record<GapClass, LogCell>>;
  /** ln(ds / (P·ρ⁰_c)) of fluent clean in-word gaps by ARRIVING finger.
   *  The engine fills it when quality.qwerty && !quantised (it can't see the
   *  hand layout); buildDigest drops it when !extras.ctx.std. Else null. */
  fin: Partial<Record<FingerId, LogCell>> | null;
  /** ln(ds) of clean in-word gaps per lower-cased letter pair (every pair seen). */
  pairs: Record<string, LogCell>;
};

export type RunAnalysis = {
  v: 1;
  quality: RunQuality;
  T: number;                   // round(durationMs)
  headMs: number;              // before the first key; included in slices.breaks
  slices: SliceSet | null;     // integer ms, Σ = T; null below the gate (§7.6)
  perMinute: SliceSet | null;  // seconds per minute, 1 dp, Σ = 60.0
  pace: {
    P: number;                 // ms per cross-hand key
    sigma: number;
    catchFactor: number;       // e^κ (the run's own catch factor, 1.6–3.0)
    boundaryMs: number;        // P_B: the run's fluent word-to-word time (§5.4)
    pauseFactor: number;       // e^κB
    breakMs: number;           // β
    intervals: number;         // |I|
  } | null;
  counts: {
    keys: number;
    /** Words reached: min(words.length, max wordIndex over events and marks + 1). */
    words: number;
    boundaries: number; pauses: number; inWord: number; catches: number;
    breaks: number;            // in-run breaks (= breaks.count)
  };
  mistakes: {
    count: number;             // slip + extra episodes (rewrites are counted separately)
    fixed: number;
    rewrites: number;          // rewrite episodes: correct text deleted and typed again (§6.2)
    left: number;              // committed words left wrong
    extras: number;
    fixingMs: number;          // = slices.fixing (0 when slices null)
    medianCostMs: number | null;  // median (Te − needed·P) of fixed slip/extra episodes
    detectMs: number | null;   // v2: median ms from the wrong key to the first backspace
    noticeKeys: number | null; // v2: median letters typed after a slip before the first backspace (fixed slips)
    lostChars: number;
    lostWpm: number;           // round(12000·lostChars / T)
    canFix: boolean;           // ctx.confidence !== "all" (the `left` copy only)
    fixMode: FixMode;
  };
  pauses: { ms: number; byLength: [[number, number], [number, number], [number, number]]; longest: { ms: number; word: string } | null };
  catches: { ms: number; topWord: string | null; pairs: [string, number][] };   // pairs: ≤ 5 by count
  /** In-run breaks: gaps, a non-race head and a tail of β or more. The race
   *  head is in slices.breaks only (it is named in the Breaks clause). */
  breaks: { ms: number; count: number };
  inWordShare: number | null;  // Σ need of in-word gaps outside episodes / T (the difficulty elasticity, §13.4)
  flowWpm: number | null;
  fade: { fromWpm: number; toWpm: number; lastSeconds: number; significant: boolean } | null;
  startUp: { words: number; ms: number } | null;
  wordFriction: { word: string; wordIndex: number; ms: number }[];    // ≤ 3, ms desc
  se: Record<FrictionKey, number> | null;      // s/min (jackknife), null under 10 words
  rcv: number | null;
  cells: AnalysisCells;
  findings: Finding[];         // ≤ 3, or exactly one of even / short / clock
};

export type DigestContext = {
  input: InputKind;
  layout: "qwerty" | "plain";  // quality.qwerty (the codeMatch rule, §4.1); never a display setting
  std: boolean;                // standard hand layout (server: fingerMapHash(prefs.handLayout) === fingerMapHash(DEFAULT_HAND_LAYOUT))
  wordlist: string | null;
  fixMode: FixMode;
  suddenDeath: boolean;
  drill: boolean;
  race: boolean;
  punctuation: boolean | null;
};

/** One row of test_analyses.digest. Compact keys, documented here. */
export type TestDigestV1 = {
  v: 1;
  ms: number;                  // T
  head: number;                // headMs
  wpm: number;                 // 1 dp
  acc: number;                 // 1 dp
  chars: number;               // round(wpm·T/12000)
  keys: number;
  words: number;               // words reached
  sl: [typing: number, fixing: number, before: number, inside: number, breaks: number];   // integer ms, Σ = ms
  se: [fixing: number, before: number, inside: number] | null;   // s/min, 2 dp
  pace: { P: number; s: number; n: number; q: "g" | "r" };        // P 1 dp, s = σ 3 dp
  flow: number | null;                                             // flowWpm 1 dp
  n: { bd: number; pa: number; in: number; ca: number; br: number };   // boundaries, pauses, clean in-word gaps, catches, breaks
  err: { n: number; fixed: number; rw: number; left: number; extra: number; ms: number;
         med: number | null; lat: number | null; nk: number | null; lost: number };   // rw rewrites; nk noticeKeys (1 dp)
  iw: number | null;                                               // inWordShare, 3 dp
  bl: [[number, number], [number, number], [number, number]];      // next-word length ≤ 4, 5–7, ≥ 8: [boundaries, pauses]
  ip: [string, number][];                                          // ≤ 5 letter pairs where catches happened, with counts
  fade: [fromWpm: number, toWpm: number] | null;                   // T ≥ 30 s and ≥ 3 windows
  rcv: number | null;                                              // 3 dp
  q: 0 | 1;                                                        // quantised
  cls: Partial<Record<GapClass, LogCell>>;                         // LogCell numbers rounded to 3 dp
  fin: Partial<Record<FingerId, LogCell>> | null;
  pairs: [key: string, n: number, sumLog: number, sumLogSq: number][];   // ≤ 16
  diff: number | null;                                             // d_rel 3 dp (server, warm model only)
  ctx: DigestContext;
};

/** What the practice provider exposes so the result screen analyses
 *  exactly what it submitted (spec-20 §5). */
export type RunAnalysisSource = { input: RunInput; bucket: string; fixMode: FixMode; startedAt: number };
