/** Small sRGB helpers for turning a MonkeyType colour scheme into
 *  flinttype colours: hex parsing, WCAG 2 contrast and mixing. Pure. */

export type Rgb = [number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc` or `#aabbcc`, lower-cased and expanded; null for anything else. */
export function normaliseHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = HEX.exec(v.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
}

function rgb(hex: string): Rgb {
  const h = hex.slice(1);
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function toHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance of a normalised hex. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two normalised hexes (1–21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `a` moved `t` of the way toward `b` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t) as Rgb);
}

/** The smallest 5% step from `from` toward `to` that reaches `min`
 *  contrast against every colour in `on`; `to` when none does. */
export function reachContrast(
  from: string,
  to: string,
  on: readonly string[],
  min: number,
): string {
  for (let step = 0; step <= 20; step += 1) {
    const c = mix(from, to, step / 20);
    if (on.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return to;
}

/** Black or white, whichever contrasts more with `bg`. */
export function bestInk(bg: string): string {
  return contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff";
}
