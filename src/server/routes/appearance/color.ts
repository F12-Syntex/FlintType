/** Pure OKLCH colour helpers for the AI "palette" / "randomize" tools.
 *  Everything stays in OKLCH (the palette flinttype is authored in), so a
 *  generated set reads as coherent. No dependencies, fully unit-tested. */

export type Oklch = { l: number; c: number; h: number };

export type Harmony =
  | "monochrome"
  | "analogous"
  | "complementary"
  | "triadic";

/** Parse a CSS colour token to OKLCH. Supports `oklch(L C H)` (L/C may be
 *  percentages) and `#rgb` / `#rrggbb` hex. Returns null for anything else
 *  (named colours, rgb(), etc.) — the caller falls back to a random base. */
export function parseColor(token: string): Oklch | null {
  const s = token.trim().toLowerCase();
  const ok = s.match(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/i,
  );
  if (ok) {
    const l = pct(ok[1]);
    const c = ok[2].endsWith("%") ? (parseFloat(ok[2]) / 100) * 0.4 : parseFloat(ok[2]);
    const h = parseFloat(ok[3]);
    if (Number.isFinite(l) && Number.isFinite(c) && Number.isFinite(h)) {
      return { l: clamp(l, 0, 1), c: Math.max(0, c), h: ((h % 360) + 360) % 360 };
    }
    return null;
  }
  if (s.startsWith("#")) return hexToOklch(s);
  return null;
}

function pct(v: string): number {
  return v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** sRGB hex → OKLCH. Standard Björn Ottosson transform. */
export function hexToOklch(hex: string): Oklch | null {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((d) => d + d).join("");
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  const r = lin(parseInt(h.slice(0, 2), 16) / 255);
  const g = lin(parseInt(h.slice(2, 4), 16) / 255);
  const b = lin(parseInt(h.slice(4, 6), 16) / 255);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let hue = (Math.atan2(bb, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  return { l: clamp(L, 0, 1), c, h: hue };
}

function lin(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function formatOklch(o: Oklch): string {
  const l = round(clamp(o.l, 0, 1), 3);
  const c = round(Math.max(0, o.c), 3);
  const h = round(((o.h % 360) + 360) % 360, 1);
  return `oklch(${l} ${c} ${h})`;
}

function round(v: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Target lightness/chroma per role. Hue is layered on by `buildPalette`.
 *  Two ramps so a generated palette matches the user's current mode. */
const LIGHT: Record<string, { l: number; c: number }> = {
  "--background": { l: 0.95, c: 0.012 },
  "--card": { l: 0.975, c: 0.01 },
  "--card-foreground": { l: 0.18, c: 0.02 },
  "--popover": { l: 0.975, c: 0.01 },
  "--popover-foreground": { l: 0.18, c: 0.02 },
  "--muted": { l: 0.92, c: 0.014 },
  "--muted-foreground": { l: 0.46, c: 0.02 },
  "--foreground": { l: 0.18, c: 0.02 },
  "--border": { l: 0.88, c: 0.012 },
  "--input": { l: 0.88, c: 0.012 },
  "--primary": { l: 0.62, c: 0.2 },
  "--primary-foreground": { l: 0.99, c: 0.005 },
  "--accent": { l: 0.9, c: 0.03 },
  "--accent-foreground": { l: 0.22, c: 0.02 },
  "--ring": { l: 0.62, c: 0.2 },
  "--ft-passage-typed": { l: 0.62, c: 0.2 },
  "--ft-passage-untyped": { l: 0.7, c: 0.02 },
  "--ft-passage-error": { l: 0.6, c: 0.2 },
};
const DARK: Record<string, { l: number; c: number }> = {
  "--background": { l: 0.16, c: 0.012 },
  "--card": { l: 0.2, c: 0.012 },
  "--card-foreground": { l: 0.95, c: 0.01 },
  "--popover": { l: 0.21, c: 0.012 },
  "--popover-foreground": { l: 0.95, c: 0.01 },
  "--muted": { l: 0.24, c: 0.014 },
  "--muted-foreground": { l: 0.65, c: 0.02 },
  "--foreground": { l: 0.95, c: 0.01 },
  "--border": { l: 0.28, c: 0.012 },
  "--input": { l: 0.28, c: 0.012 },
  "--primary": { l: 0.68, c: 0.19 },
  "--primary-foreground": { l: 0.16, c: 0.01 },
  "--accent": { l: 0.28, c: 0.03 },
  "--accent-foreground": { l: 0.92, c: 0.01 },
  "--ring": { l: 0.68, c: 0.19 },
  "--ft-passage-typed": { l: 0.68, c: 0.19 },
  "--ft-passage-untyped": { l: 0.5, c: 0.02 },
  "--ft-passage-error": { l: 0.66, c: 0.19 },
};

export const DEFAULT_PALETTE_ROLES = [
  "--background",
  "--foreground",
  "--card",
  "--muted",
  "--muted-foreground",
  "--border",
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--ring",
];

function harmonyOffset(harmony: Harmony): number {
  switch (harmony) {
    case "complementary":
      return 180;
    case "triadic":
      return 120;
    case "analogous":
      return 30;
    default:
      return 0;
  }
}

/** Build a coherent set of OKLCH colours for `roles`, tinted toward
 *  `base`'s hue, with accent roles taking the harmony offset. `dark`
 *  selects the lightness ramp so the result matches the current mode. */
export function buildPalette(
  base: Oklch,
  harmony: Harmony,
  roles: readonly string[],
  dark: boolean,
): Record<string, string> {
  const ramp = dark ? DARK : LIGHT;
  const out: Record<string, string> = {};
  for (const role of roles) {
    const t = ramp[role];
    if (!t) continue;
    // `--primary` (and everything else) carries the base hue — it *is* the
    // colour the user chose. Only the secondary `--accent` takes the
    // harmony offset, so the set reads as one coherent palette with one
    // complementary/analogous/triadic accent.
    const hue = role === "--accent" ? base.h + harmonyOffset(harmony) : base.h;
    out[role] = formatOklch({ l: t.l, c: t.c, h: hue });
  }
  return out;
}

/** A tasteful random colour for a single theme var: the role's lightness
 *  and chroma band with a random hue, so "randomise the accent" stays a
 *  usable colour rather than pure noise. */
export function randomColorForVar(varName: string, dark: boolean): string {
  const ramp = dark ? DARK : LIGHT;
  const t = ramp[varName] ?? { l: 0.62, c: 0.18 };
  return formatOklch({ l: t.l, c: t.c, h: Math.random() * 360 });
}

export function randomBase(): Oklch {
  return { l: 0.62, c: 0.2, h: Math.random() * 360 };
}

export function isDark(backgroundToken: string | undefined): boolean {
  if (!backgroundToken) return false;
  const o = parseColor(backgroundToken);
  return o ? o.l < 0.5 : false;
}

export function normalizeHarmony(v: unknown): Harmony {
  if (
    v === "monochrome" ||
    v === "analogous" ||
    v === "complementary" ||
    v === "triadic"
  ) {
    return v;
  }
  return "analogous";
}
