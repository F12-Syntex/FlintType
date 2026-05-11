import type { NewTestRow } from "@/types/adapt";

/** Shape of a MonkeyType result we care about, narrowed from their
 *  full payload. Anything outside these fields is ignored — MT adds
 *  fields over time and we want to be lenient. */
export type MtResult = {
  _id: string;
  wpm: number;
  acc: number;
  /** Top-level mode: "time" | "words" | "quote" | "custom" | "zen". */
  mode: string;
  /** Mode-specific length. For time, seconds (e.g. "30"). For words,
   *  count (e.g. "50"). For quote, length category. */
  mode2: string | number;
  /** UNIX ms when the test ran. */
  timestamp: number;
  /** Duration of the test in seconds. */
  testDuration: number;
  incorrectChars: number;
};

const API_BASE = "https://api.monkeytype.com";

/** Pull the caller's MonkeyType results via their Ape Key. Returns
 *  the raw `data` array exactly as MT serves it; the route layer
 *  filters, dedupes, and maps to local rows.
 *
 *  MT auth: `Authorization: ApeKey <key>`. Network failures throw
 *  through; the route layer maps them to UPSTREAM errors. */
export async function fetchMonkeytypeResults(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MtResult[]> {
  const res = await fetchImpl(`${API_BASE}/results`, {
    headers: {
      Authorization: `ApeKey ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new MtAuthError("MonkeyType rejected the Ape Key.");
    }
    if (res.status === 429) {
      throw new MtRateLimitError(
        "MonkeyType rate-limited the request. Try again later.",
      );
    }
    throw new MtUpstreamError(
      `MonkeyType returned ${res.status}.`,
    );
  }
  const json = (await res.json()) as { data?: MtResult[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Best-effort mapping from a MonkeyType result to a flinttype
 *  test row. The schemas don't line up exactly:
 *    - MT mode "time" / "words" / "quote" → flinttype "casual"
 *      (we don't track the algorithmic distinction MT lacks)
 *    - mode2 is the duration/length — we coerce to integer
 *    - reset count has no MT equivalent → 0
 *    - wasCompleted is true (MT only saves completed runs) */
export function mtResultToRow(
  r: MtResult,
  userId: string,
  id: string,
): NewTestRow | null {
  const startedMs = Number(r.timestamp);
  if (!Number.isFinite(startedMs) || startedMs <= 0) return null;
  const durationSec = Number(r.testDuration);
  if (!Number.isFinite(durationSec) || durationSec < 0) return null;
  const amount = Number(r.mode2);
  return {
    id,
    userId,
    startedAt: new Date(startedMs),
    completedAt: new Date(startedMs + durationSec * 1000),
    mode: "casual",
    durationOrWordCount: Number.isFinite(amount) ? Math.round(amount) : 0,
    wpm: Number(r.wpm) || 0,
    accuracy: Number(r.acc) || 0,
    errorCount: Number(r.incorrectChars) || 0,
    resetCount: 0,
    wasCompleted: true,
  };
}

export class MtAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MtAuthError";
  }
}
export class MtRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MtRateLimitError";
  }
}
export class MtUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MtUpstreamError";
  }
}
