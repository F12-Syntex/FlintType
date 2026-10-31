/** Checks for the flinttype file values that a simple spec can't
 *  express: test lengths that depend on the mode, the hand layout, and
 *  theme override text. Pure. */

/** The length a mode starts on (practice-words.ts `defaultLengthFor`;
 *  lib can't import from app, so keep the two in step). */
export function defaultLengthFor(mode: unknown): number {
  if (mode === "TIME") return 30;
  if (mode === "QUOTE") return 1;
  if (mode === "BURST") return 40;
  return 25;
}

/** A test length the mode can run: a quote bracket 0 to 3, otherwise
 *  1 to 1,000 words, seconds or items. */
export function validLength(mode: unknown, v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  if (mode === "QUOTE") return Number.isInteger(v) && v >= 0 && v <= 3 ? v : undefined;
  return v >= 1 ? Math.min(Math.round(v), 1000) : undefined;
}

/** The length to land on when a file sets `mode` but no length the
 *  mode can use. While the mode stays the same, the stored length is
 *  kept (undefined: nothing to write). A mode change starts on the
 *  mode's default, as picking the mode in the mode bar does, since the
 *  stored length counts another unit. */
export function fallbackLength(
  mode: unknown,
  current: { mode?: unknown; length?: unknown },
): number | undefined {
  if (mode === current.mode && validLength(mode, current.length) !== undefined) return undefined;
  return defaultLengthFor(mode);
}

const FINGERS = ["L5", "L4", "L3", "L2", "L1", "R1", "R2", "R3", "R4", "R5"];

/** A complete, well-formed `fingers` map, or undefined. */
export function validHandLayout(v: unknown): Record<string, { enabled: boolean; homeKey: string }> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, { enabled: boolean; homeKey: string }> = {};
  for (const id of FINGERS) {
    const f = (v as Record<string, unknown>)[id] as { enabled?: unknown; homeKey?: unknown } | undefined;
    if (!f || typeof f.enabled !== "boolean" || typeof f.homeKey !== "string") return undefined;
    if (!/^[A-Za-z0-9]{1,24}$/.test(f.homeKey)) return undefined;
    out[id] = { enabled: f.enabled, homeKey: f.homeKey };
  }
  return out;
}

/** A theme override value: one CSS token, nothing that could escape the
 *  inline style or load anything. */
export function safeCssValue(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (s.length === 0 || s.length > 200) return undefined;
  if (/[;{}<>\\]/.test(s)) return undefined;
  if (/url\(|@import|expression\(|javascript:/i.test(s)) return undefined;
  return s;
}
