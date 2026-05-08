/** History page payload — one round-trip serves every panel:
 *  Headline insights, Daily chart, Pair evolution, Records, Run log.
 *  All client-side aggregation (binning by date, computing PRs,
 *  picking insights) reads from these arrays. */
export type HistoryTest = {
  id: string;
  startedAtMs: number;
  completedAtMs: number;
  /** "training" / "casual" / "reverse_adaptive" — see TestMode. */
  mode: string;
  /** Words for WORDS mode, seconds for TIME mode. */
  durationOrWordCount: number;
  wpm: number;
  accuracy: number;
  errorCount: number;
  wasCompleted: boolean;
};

export type HistoryWeakness = {
  /** Bigram key (lowercase, e.g. "th"). */
  key: string;
  /** Running-mean keystroke time, ms. */
  meanMs: number;
  /** Pre-computed weakness against the user's bigram baseline. */
  weakness: number;
  /** Sample count behind the mean. */
  sampleCount: number;
};

export type HistorySummaryOutput = {
  /** Newest-first. Capped at 500 — covers ~90 days of regular use. */
  recentTests: HistoryTest[];
  /** Top 12 weakest bigrams with enough samples to score. */
  weakestPairs: HistoryWeakness[];
  /** True until the user has typed enough for the algorithm to score
   *  bigrams. Page should fall back to "no data yet" copy. */
  cold: boolean;
  /** User's overall bigram baseline (sample-weighted mean ms). 0 on
   *  cold start. */
  bigramBaselineMs: number;
};
