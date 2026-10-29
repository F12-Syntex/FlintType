import type { Theme } from "@/lib/themes/registry";

/** Pure logic behind the Corners row (`radius-row.tsx`): which preset
 *  the page is actually showing, and what picking one writes. Tested in
 *  `radius-presets.test.ts`.
 *
 *  A palette paints its own `radius` under any override, so "no
 *  override" means the active palette's radius, not the Default
 *  theme's 1rem. A pick removes the override only when the palette
 *  already gives that radius; otherwise it writes the value, so Round
 *  on a 0.5rem palette really gives 1rem corners. */

/** The Default theme's card radius (`--radius` in globals.css), also
 *  what a palette without its own `radius` var leaves in place. */
export const DEFAULT_RADIUS_REM = 1;

export const RADIUS_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  rem: number;
}> = [
  { id: "sharp", label: "Sharp", rem: 0 },
  { id: "subtle", label: "Subtle", rem: 0.375 },
  { id: "soft", label: "Soft", rem: 0.625 },
  { id: "round", label: "Round", rem: DEFAULT_RADIUS_REM },
  { id: "pillowy", label: "Pillowy", rem: 1.5 },
];

const SAME_REM = 0.01;

/** A CSS length as rem: "0.5rem" → 0.5, "8px" → 0.5, "0" → 0. Unset or
 *  unreadable values give undefined. */
export function remOf(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return undefined;
  return value.trim().endsWith("px") ? n / 16 : n;
}

/** The radius a palette paints with no override: its own `radius` var,
 *  else the Default theme's. Default, Background reactive and unknown
 *  palettes pass `undefined`. Light and dark share one radius in every
 *  shipped palette, so the light value stands for both. */
export function paletteRadiusRem(theme: Pick<Theme, "cssVars"> | undefined): number {
  return remOf(theme?.cssVars.light.radius) ?? DEFAULT_RADIUS_REM;
}

/** The radius the page is showing: the override, else the palette's. */
export function shownRadiusRem(
  override: string | undefined,
  paletteRem: number,
): number {
  return remOf(override) ?? paletteRem;
}

/** The preset id matching the radius on screen (none when it sits
 *  between presets, e.g. a palette's own 0.5rem). */
export function activeRadiusPreset(shownRem: number): string | undefined {
  return RADIUS_PRESETS.find((p) => Math.abs(p.rem - shownRem) < SAME_REM)?.id;
}

export type RadiusWrite = { kind: "clear" } | { kind: "set"; value: string };

/** What picking `rem` writes. `baselineOverride` is the `--radius` the
 *  active palette's own presets set (Claymorphism 0.75rem, Cyberpunk
 *  0rem), so matching it writes that exact value and the page reads as
 *  unchanged. With no palette preset, a pick equal to the palette's own
 *  radius clears the override; any other pick writes `<rem>rem`. */
export function radiusWrite(
  rem: number,
  {
    paletteRem,
    baselineOverride,
  }: { paletteRem: number; baselineOverride: string | undefined },
): RadiusWrite {
  const baselineRem = remOf(baselineOverride);
  if (baselineOverride && baselineRem !== undefined) {
    if (Math.abs(baselineRem - rem) < SAME_REM) {
      return { kind: "set", value: baselineOverride };
    }
  } else if (Math.abs(paletteRem - rem) < SAME_REM) {
    return { kind: "clear" };
  }
  return { kind: "set", value: `${rem}rem` };
}
