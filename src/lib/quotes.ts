"use client";

export type Quote = {
  text: string;
  source: string;
  length: number;
  id: number;
};

export type QuoteGroup = 0 | 1 | 2 | 3;

/** Length brackets used by monkeytype's quote dataset; we expose them as
 *  named groups in the UI so the user picks "short / medium / long / thicc"
 *  rather than raw character counts. */
export const QUOTE_GROUPS: ReadonlyArray<{
  id: QuoteGroup;
  label: string;
  min: number;
  max: number;
}> = [
  { id: 0, label: "short", min: 0, max: 100 },
  { id: 1, label: "medium", min: 101, max: 300 },
  { id: 2, label: "long", min: 301, max: 600 },
  { id: 3, label: "thicc", min: 601, max: 9999 },
];

const QUOTES_URL = "/quotes/monkeytype/english.json";

let cache: Quote[] | null = null;
let inFlight: Promise<Quote[]> | null = null;

/** Fetch the english quote pool once per page load. The dataset is ~2.3 MB
 *  so we keep it out of the client bundle and pull it lazily the first
 *  time QUOTE mode is selected. Module-scoped cache survives every later
 *  mode-switch / restart. */
export async function loadQuotes(): Promise<Quote[]> {
  if (cache) return cache;
  if (inFlight) return inFlight;
  inFlight = fetch(QUOTES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`quotes fetch failed: ${r.status}`);
      return r.json() as Promise<{ quotes: Quote[] }>;
    })
    .then((d) => {
      cache = d.quotes;
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function pickQuote(quotes: Quote[], group: QuoteGroup): Quote {
  const g = QUOTE_GROUPS[group]!;
  const filtered = quotes.filter(
    (q) => q.length >= g.min && q.length <= g.max,
  );
  const pool = filtered.length > 0 ? filtered : quotes;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
