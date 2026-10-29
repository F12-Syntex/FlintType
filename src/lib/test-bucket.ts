/** "Same kind of test": runs are only ever compared within one bucket of
 *  the same mode, length unit and length (plus touch input, which gets
 *  its own bucket). Pure and isomorphic: the server's form signals
 *  (`session-form.ts`), the stored test analyses and the result screen
 *  all key their comparisons with this one function. */

export type BucketSpec = {
  mode: string;
  lengthMode: "words" | "time" | "quote" | null;
  length: number;
};

const LENGTH_MODES = ["words", "time", "quote"] as const;
const MODE_RE = /^[A-Za-z0-9_-]+$/;
const LENGTH_RE = /^\d{1,6}$/;
const TOUCH_SUFFIX = "t";

/** Tests further apart than this start a new session. */
export const SESSION_GAP_MS = 30 * 60_000;

/** Exactly the old session-form `runBucket` string for touch = false:
 *  `${mode}|${lengthMode ?? ""}|${length}`, plus "|t" when touch. */
export function runBucketKey(s: BucketSpec, touch: boolean): string {
  const key = `${s.mode}|${s.lengthMode ?? ""}|${s.length}`;
  return touch ? `${key}|${TOUCH_SUFFIX}` : key;
}

/** Inverse of `runBucketKey`; null for a malformed key. An empty length
 *  unit (legacy rows) parses to a null `lengthMode`. */
export function parseRunBucketKey(key: string): (BucketSpec & { touch: boolean }) | null {
  if (typeof key !== "string") return null;
  const parts = key.split("|");
  if (parts.length !== 3 && parts.length !== 4) return null;
  const [mode, unit, len, suffix] = parts as [string, string, string, string | undefined];
  if (!MODE_RE.test(mode)) return null;
  if (suffix !== undefined && suffix !== TOUCH_SUFFIX) return null;
  if (!LENGTH_RE.test(len)) return null;
  let lengthMode: BucketSpec["lengthMode"] = null;
  if (unit !== "") {
    if (!(LENGTH_MODES as readonly string[]).includes(unit)) return null;
    lengthMode = unit as BucketSpec["lengthMode"];
  }
  return { mode, lengthMode, length: Number(len), touch: suffix === TOUCH_SUFFIX };
}

/** A stored test row as a BucketSpec (length = durationOrWordCount). The
 *  `tests.length_mode` column is open text, so anything outside the
 *  three units reads as a legacy null. */
export function toBucketSpec(row: {
  mode: string;
  lengthMode: string | null;
  durationOrWordCount: number;
}): BucketSpec {
  const unit = row.lengthMode;
  const lengthMode =
    unit != null && (LENGTH_MODES as readonly string[]).includes(unit)
      ? (unit as BucketSpec["lengthMode"])
      : null;
  return { mode: row.mode, lengthMode, length: row.durationOrWordCount };
}

/** Newest-first rows → sessions (each newest first), a session being a
 *  chain of tests each starting within SESSION_GAP_MS of the next. A gap
 *  of exactly SESSION_GAP_MS still chains. */
export function splitSessions<T extends { startedAtMs: number }>(rows: readonly T[]): T[][] {
  const out: T[][] = [];
  let current: T[] = [];
  for (const row of rows) {
    const prev = current[current.length - 1];
    if (prev && prev.startedAtMs - row.startedAtMs > SESSION_GAP_MS) {
      out.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length > 0) out.push(current);
  return out;
}
