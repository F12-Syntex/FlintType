/** Rolling-mean client-side cache of recent test WPMs. Lets us seed
 *  BURST mode's threshold default to "your average" without a backend
 *  round-trip. The samples list is kept short (cap MAX_SAMPLES) so
 *  the mean responds to recent improvements rather than dragging
 *  long-dead numbers forward.
 *
 *  Pure storage helpers — no React. The hook lives next to the
 *  practice provider since that's the one place that observes test
 *  completions in the right scope. */

import { getCacheOwner } from "./cache-owner";

const KEY_PREFIX = "ft:avg-wpm-samples";
const MAX_SAMPLES = 20;
const DEFAULT_FALLBACK = 50;

// Namespaced by the signed-in user so one account's rolling average
// can't seed another account's BURST threshold on a shared browser
// (FT-041).
function keyFor(): string {
  return `${KEY_PREFIX}:${getCacheOwner()}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read(): number[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(keyFor());
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null))
      .filter((v): v is number => v !== null && v > 0);
  } catch {
    return [];
  }
}

function write(samples: number[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(keyFor(), JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    // Quota / private window — fail closed; threshold falls back to
    // DEFAULT_FALLBACK until the user opts a custom value.
  }
}

/** Append a completed-run WPM. Called by the practice provider when
 *  a test finishes (any mode — TIME / WORDS / QUOTE all contribute,
 *  BURST does not since its threshold is what we're computing the
 *  reference for). */
export function recordWpmSample(wpm: number): void {
  if (!Number.isFinite(wpm) || wpm <= 0) return;
  const next = [...read(), wpm];
  write(next);
}

/** Mean of the cached samples. Returns `DEFAULT_FALLBACK` when the
 *  cache is empty so first-time users see a usable BURST threshold
 *  rather than 0. */
export function getAverageWpm(): number {
  const samples = read();
  if (samples.length === 0) return DEFAULT_FALLBACK;
  const total = samples.reduce((s, v) => s + v, 0);
  return Math.round(total / samples.length);
}

/** Effective BURST threshold given the user's pref + their rolling
 *  average. Used by the burst surface on mount. */
export function resolveBurstThreshold(pref: number): number {
  if (pref > 0) return Math.floor(pref);
  return getAverageWpm();
}

export const BURST_THRESHOLD_FALLBACK = DEFAULT_FALLBACK;
