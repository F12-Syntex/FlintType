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

export type MtPbEntry = {
  wpm: number;
  acc: number;
  raw?: number;
  consistency?: number;
  language?: string;
  punctuation?: boolean;
  numbers?: boolean;
  timestamp?: number;
};

/** /users/personalBests?mode={time|words} payload. Each top-level
 *  key is the length (seconds for time, count for words); the value
 *  is an array of PB entries (one per language/punctuation/numbers
 *  combo). We pick the highest-WPM entry per length. */
export type MtPbResponse = {
  data?: Record<string, MtPbEntry[]>;
};

export type MtStats = {
  completedTests?: number;
  startedTests?: number;
  /** Lifetime time spent typing, in seconds. */
  timeTyping?: number;
};

const API_BASE = "https://api.monkeytype.com";

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `ApeKey ${apiKey}`,
    Accept: "application/json",
    // Some upstreams (CDNs, WAFs) block the default Node fetch UA;
    // identify ourselves explicitly so MT's gateway routes the
    // request normally.
    "User-Agent": "flinttype-import/1.0 (+https://flinttype.local)",
  };
}

async function callMt<T>(
  apiKey: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}${path}`, {
      headers: authHeaders(apiKey),
    });
  } catch (networkErr) {
    // fetch() itself rejected (DNS, TLS, sockets, etc). Wrap so the
    // route layer can map cleanly; without this the raw TypeError
    // leaks through.
    throw new MtUpstreamError(
      `MonkeyType network error on ${path}: ${
        networkErr instanceof Error ? networkErr.message : String(networkErr)
      }`,
    );
  }
  if (!res.ok) {
    // Best-effort: pull the upstream message so the operator sees
    // *why* MT refused (bad path, expired key, missing scope, etc).
    // MT errors come back as either plain text or JSON {message}.
    let detail = "";
    try {
      const body = await res.text();
      try {
        const json = JSON.parse(body) as { message?: string };
        detail = json.message ?? body;
      } catch {
        detail = body;
      }
    } catch {
      /* ignore body-read failure — surface status only */
    }
    const detailSuffix = detail ? ` — ${detail.slice(0, 200)}` : "";
    // MT uses non-standard 47x codes for Ape Key states:
    //   470 = ApeKey not found
    //   471 = ApeKey inactive (toggle it on in MT account settings)
    //   472 = ApeKey malformed
    //   473 = ApeKey rate limit exceeded
    // All except 473 are auth-side problems the user can fix; 473
    // is a rate-limit. Anything else is a real upstream error.
    if (
      res.status === 401 ||
      res.status === 403 ||
      res.status === 470 ||
      res.status === 471 ||
      res.status === 472
    ) {
      throw new MtAuthError(
        `MonkeyType refused the Ape Key (${res.status})${detailSuffix}`,
      );
    }
    if (res.status === 429 || res.status === 473) {
      throw new MtRateLimitError(
        `MonkeyType rate-limited (${res.status}). Try again later${detailSuffix}`,
      );
    }
    throw new MtUpstreamError(
      `MonkeyType ${path} returned ${res.status}${detailSuffix}`,
    );
  }
  return (await res.json()) as T;
}

/** Last N MT results (default 10). Used to seed the local tests table. */
export async function fetchMonkeytypeResults(
  apiKey: string,
  limit = 10,
  fetchImpl: typeof fetch = fetch,
): Promise<MtResult[]> {
  const json = await callMt<{ data?: MtResult[] }>(
    apiKey,
    `/results?limit=${encodeURIComponent(String(limit))}`,
    fetchImpl,
  );
  return Array.isArray(json.data) ? json.data : [];
}

/** Personal bests grouped by length. For each length we keep the
 *  single highest-WPM entry and drop the language / punctuation /
 *  numbers axis — flinttype's PB grid is mode × length, not mode ×
 *  length × language. */
export async function fetchPersonalBests(
  apiKey: string,
  mode: "time" | "words",
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, { wpm: number; acc: number }>> {
  const json = await callMt<MtPbResponse>(
    apiKey,
    `/users/personalBests?mode=${mode}`,
    fetchImpl,
  );
  const out: Record<string, { wpm: number; acc: number }> = {};
  if (!json.data) return out;
  for (const [length, entries] of Object.entries(json.data)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const top = entries.reduce<MtPbEntry | null>(
      (m, e) => (m == null || (e.wpm ?? 0) > (m.wpm ?? 0) ? e : m),
      null,
    );
    if (!top) continue;
    out[length] = {
      wpm: Number(top.wpm) || 0,
      acc: Number(top.acc) || 0,
    };
  }
  return out;
}

/** Lifetime stats for the user: started + completed tests, total
 *  time typing in seconds. */
export async function fetchMonkeytypeStats(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MtStats> {
  const json = await callMt<{ data?: MtStats }>(
    apiKey,
    `/users/stats`,
    fetchImpl,
  );
  return json.data ?? {};
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
