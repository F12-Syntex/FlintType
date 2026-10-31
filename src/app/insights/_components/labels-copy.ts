import { perKey, plural } from "@/lib/format-figure";

/** Fixed labels for the lower half of /insights (spec-40 §3.4, §3.7,
 *  §3.8): the practice lists, the picker, the playground and the
 *  footer. The speed chart's copy is in trend-copy.ts. Kept beside the
 *  other copy modules so every string the page shows is tested
 *  (labels-copy.test.ts). Pure, no JSX. */

// Where it shows (§3.4)
export const PAIRS_TITLE = "Letter pairs";
export const PAIRS_CAPTION = "Your slowest letter pairs, with the extra time each takes.";
export const PAIR_HEADER = "Pair";
export const WORDS_TITLE = "Words that are slow for their length";
export const WORDS_NOTE = "Timed on words you typed without a mistake.";
export const WORDS_CAPTION = "Your slowest words for their length, with the extra time each takes.";
export const WORD_HEADER = "Word";
export const EXTRA_HEADER = "Extra each time";
export const MEASURED_HEADER = "Times measured";
export const PRACTISE_PAIRS = "Practise these pairs";
export const PRACTISE_WORDS = "Practise these words";
export const PAIRS_LOCKED = "Unlocks once we've seen more of your typing.";
export const WORDS_LOCKED = "Unlocks once we've timed 5 slow words.";
export const PAIRS_EMPTY = "No letter pair stands out yet.";
export const WORDS_EMPTY = "No word stands out yet.";

/** A row's extra time: "+0.12 s", or "under 0.01 s" when it would
 *  round to nothing (a zero is never shown as a finding). */
export function extraLabel(ms: number): string {
  const s = perKey(ms);
  return s === perKey(0) ? "under 0.01 s" : `+${s}`;
}

// Bucket picker, time table, loading (§3.0, §3.2, §4)
export const PICKER_TITLE = "Which tests?";
export const PICKER_LABEL = "Which tests";
export const TOUCH_LABEL = "Touch";
/** The pooled "All Adapt tests" option's length line. */
export const ALL_LENGTHS_LABEL = "All lengths";
export const COLUMN_LAST = "Last test";
/** The last-test table's clauses. The learning minute carries no break
 *  threshold or fix mode, so these name neither (the ready table's come
 *  from `breakClause` and `fixingClause`). */
export const LAST_BREAK_CLAUSE = "Long stops, and the wait before your first key in a race.";
export const LAST_FIXING_CLAUSE = "The extra time your mistakes cost you.";
export const MINUTE_TICKS = ["0 s", "30 s", "60 s"] as const;
export const COLUMN_RECENT = "Recently";
export const COLUMN_BETTER = "Better days";
export const LOADING_LABEL = "Loading your insights";
export const SCORING_LABEL = "Scoring your words";

export function scoringValue(scored: number, total: number): string {
  return `${scored} of ${total} words scored`;
}

// Footer (§3.8)
export const TECHNICAL_VIEW = "See the technical view";
export const BROWSE_DRILLS = "Browse drills";
export const DELETE_ANALYSIS = "Delete my typing analysis";
export const DELETE_TITLE = "Delete your typing analysis?";
/** No "model" (spec-40 §1 principle 4): name what stays in plain words. */
export const DELETE_BODY =
  "This removes the summary of each past test. Your test results, and what Adapt has learned about your typing, stay.";
export const DELETE_CONFIRM = "Delete analysis";
export const DELETING = "Deleting…";

export function deletedLine(n: number): string {
  return `Deleted the analysis of ${plural(n, "test", "tests")}.`;
}

/** The delete failed: say so, with the code when there is one. */
export function deleteFailedLine(code: string | null): string {
  return code ? `We couldn't delete your analysis. Error code: ${code}.` : "We couldn't delete your analysis. Check your connection, then try again.";
}
