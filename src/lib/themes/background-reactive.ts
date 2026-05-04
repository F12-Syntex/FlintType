/** Synthesises a palette from the user's background image and writes it
 *  onto :root as the same CSS variables every other theme uses. The
 *  "background reactive" entry in the theme picker is wired to this —
 *  picking it samples the current image, every change to the image
 *  re-samples.
 *
 *  Sampling strategy: draw the image into a tiny 32x32 canvas, average
 *  every pixel, and derive a 5-stop palette around that mean. The
 *  result is intentionally low-resolution — we want a *vibe*, not an
 *  exact dominant colour. */

export const BACKGROUND_REACTIVE_ID = "background-reactive";

const SAMPLE_VAR_NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
] as const;

type Hsl = { h: number; s: number; l: number };

export type ReactivePalette = Record<(typeof SAMPLE_VAR_NAMES)[number], string>;

/** Sample the average colour of `imageUrl` from a 32x32 downscale,
 *  then synthesise a palette in the requested light/dark mode. The
 *  hue/saturation come from the image; the lightness ramp is fixed by
 *  `mode` so the user's mode toggle is always honoured even on a dark
 *  photo in light mode (and vice-versa). Resolves null when the image
 *  fails to load (CORS, broken URL) so callers can fall back. */
export async function samplePalette(
  imageUrl: string,
  mode: "light" | "dark" = "light",
): Promise<ReactivePalette | null> {
  if (!imageUrl) return null;
  const rgb = await averageColor(imageUrl);
  if (!rgb) return null;
  const base = rgbToHsl(rgb);
  return buildPalette(base, mode);
}

function averageColor(
  url: string,
): Promise<{ r: number; g: number; b: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // crossOrigin so canvas readback works for remote URLs that allow
    // CORS. Data-URL uploads (the common case) don't need this but it
    // doesn't hurt them.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 32;
        const h = 32;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let r = 0;
        let g = 0;
        let b = 0;
        const total = w * h;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i] ?? 0;
          g += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
        }
        resolve({ r: r / total, g: g / total, b: b / total });
      } catch {
        // CORS-tainted canvas throws on getImageData. Bail.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function buildPalette(base: Hsl, mode: "light" | "dark"): ReactivePalette {
  // The mode toggle is the source of truth — light or dark is always
  // honoured regardless of how bright/dark the source image is. Only
  // the *hue* and *saturation* of the synthesised palette come from
  // the sampled image; the lightness ramp is fixed per mode.
  const dark = mode === "dark";
  const accentHue = base.h;
  const accentSat = clamp(Math.max(base.s, 0.5), 0, 1);
  // Offset the hue 25° to keep "primary" feeling related but not
  // identical to the dominant background colour.
  const primaryHue = (accentHue + 25) % 360;

  const bgL = dark ? 0.12 : 0.96;
  const fgL = dark ? 0.92 : 0.12;
  const cardL = dark ? 0.16 : 0.99;
  const mutedL = dark ? 0.22 : 0.9;
  const mutedFgL = dark ? 0.65 : 0.45;
  const borderL = dark ? 0.25 : 0.88;

  const bg: Hsl = { h: base.h, s: 0.04, l: bgL };
  const fg: Hsl = { h: base.h, s: 0.05, l: fgL };
  const card: Hsl = { h: base.h, s: 0.05, l: cardL };
  const muted: Hsl = { h: base.h, s: 0.06, l: mutedL };
  const mutedFg: Hsl = { h: base.h, s: 0.05, l: mutedFgL };
  const border: Hsl = { h: base.h, s: 0.05, l: borderL };
  const primary: Hsl = { h: primaryHue, s: accentSat, l: dark ? 0.62 : 0.5 };
  const primaryFg: Hsl = { h: primaryHue, s: 0.1, l: dark ? 0.1 : 0.98 };
  const accent: Hsl = { h: accentHue, s: accentSat * 0.4, l: dark ? 0.32 : 0.92 };
  const accentFg: Hsl = { h: accentHue, s: accentSat, l: dark ? 0.82 : 0.3 };
  const secondary: Hsl = { h: base.h, s: 0.05, l: dark ? 0.22 : 0.92 };
  const secondaryFg: Hsl = { h: base.h, s: 0.04, l: dark ? 0.92 : 0.18 };

  return {
    background: hslCss(bg),
    foreground: hslCss(fg),
    card: hslCss(card),
    "card-foreground": hslCss(fg),
    popover: hslCss(card),
    "popover-foreground": hslCss(fg),
    primary: hslCss(primary),
    "primary-foreground": hslCss(primaryFg),
    secondary: hslCss(secondary),
    "secondary-foreground": hslCss(secondaryFg),
    muted: hslCss(muted),
    "muted-foreground": hslCss(mutedFg),
    accent: hslCss(accent),
    "accent-foreground": hslCss(accentFg),
    border: hslCss(border),
    input: hslCss(border),
    ring: hslCss(primary),
  };
}

/** Apply a sampled palette as inline :root styles. Mirrors what
 *  registry.applyTheme does for static themes so they coexist cleanly. */
export function applyReactivePalette(
  root: HTMLElement,
  palette: ReactivePalette,
): void {
  for (const k of SAMPLE_VAR_NAMES) {
    root.style.setProperty(`--${k}`, palette[k]);
  }
}

/** Strip every variable the reactive palette can write — used when the
 *  user picks a different theme so its colours don't bleed. */
export function clearReactivePalette(root: HTMLElement): void {
  for (const k of SAMPLE_VAR_NAMES) {
    root.style.removeProperty(`--${k}`);
  }
}

// ─── Maths helpers ───────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslCss({ h, s, l }: Hsl): string {
  const sp = (s * 100).toFixed(1);
  const lp = (l * 100).toFixed(1);
  return `hsl(${h.toFixed(1)} ${sp}% ${lp}%)`;
}
