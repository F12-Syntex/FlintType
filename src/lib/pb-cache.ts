"use client";

/** Client-only PB cache. Lives in localStorage keyed by mode + length
 *  so the TestSummary can detect a new highscore the instant a run
 *  finishes — no backend round-trip, no race condition with the
 *  test-submission effect that may or may not have landed yet.
 *
 *  Treats unknown keys as 0 so the first run on any (mode, length)
 *  bucket is always recorded as a PB. Reset on logout / clear-site-
 *  data via standard localStorage semantics. */
const KEY_PREFIX = "ft:pb:";

function keyFor(mode: string, amount: number): string {
  return `${KEY_PREFIX}${mode}|${amount}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getCachedPb(mode: string, amount: number): number {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(keyFor(mode, amount));
  if (!raw) return 0;
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) ? v : 0;
}

export function setCachedPb(mode: string, amount: number, wpm: number): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(keyFor(mode, amount), String(wpm));
  } catch {
    // Quota exceeded / private window — fail closed; the PB just won't
    // persist across sessions, which is the soft-fail we want.
  }
}

/** Combined check + write. Returns true when the supplied wpm beats
 *  the cached value (and updates it). Returns false if the cached
 *  value is >= wpm — caller leaves their celebration UI alone. */
export function recordIfPb(mode: string, amount: number, wpm: number): boolean {
  const prev = getCachedPb(mode, amount);
  if (wpm <= prev) return false;
  setCachedPb(mode, amount, wpm);
  return true;
}
