import type { Theme } from "@/lib/themes/use-palette";

/** Snapshot of the CSS roles the explorer tiles read. Built from a
 *  theme's `cssVars` (with sensible fall-backs) so the tile can paint
 *  without hitting the live `var()` cascade — which would otherwise
 *  resolve to the *active* theme, defeating the preview. */
export type PreviewVars = {
  background: string;
  foreground: string;
  card: string;
  "card-foreground"?: string;
  primary: string;
  "primary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground"?: string;
  destructive?: string;
  border: string;
  "font-sans"?: string;
  "font-mono"?: string;
  radius?: string;
};

/** Default-theme preview values — the default palette has no entry in
 *  THEMES (it's just :root + .dark in globals.css), so we hand-roll a
 *  PreviewVars block matching it. Values track globals.css. */
export const DEFAULT_VARS: Record<"light" | "dark", PreviewVars> = {
  light: {
    background: "oklch(0.9450 0.0180 85)",
    foreground: "oklch(0.1900 0.0120 60)",
    card: "oklch(0.9650 0.0150 85)",
    "card-foreground": "oklch(0.1900 0.0120 60)",
    // The flame-logo orange — the brand's theme colour.
    primary: "#f97316",
    "primary-foreground": "oklch(1.0000 0 0)",
    muted: "oklch(0.9150 0.0160 85)",
    "muted-foreground": "oklch(0.4600 0.0120 70)",
    accent: "oklch(0.8900 0.0160 85)",
    "accent-foreground": "oklch(0.1900 0.0120 60)",
    destructive: "oklch(0.5800 0.2100 27)",
    border: "oklch(0.8700 0.0180 85)",
    "font-sans": '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
    "font-mono": '"IBM Plex Mono", ui-monospace, monospace',
    radius: "1rem",
  },
  dark: {
    background: "oklch(0.1550 0.0060 60)",
    foreground: "oklch(0.9400 0.0080 80)",
    card: "oklch(0.1900 0.0070 60)",
    "card-foreground": "oklch(0.9400 0.0080 80)",
    primary: "#f97316",
    "primary-foreground": "oklch(1.0000 0 0)",
    muted: "oklch(0.2450 0.0080 60)",
    "muted-foreground": "oklch(0.6900 0.0100 75)",
    accent: "oklch(0.2700 0.0090 60)",
    "accent-foreground": "oklch(0.9400 0.0080 80)",
    destructive: "oklch(0.7044 0.1872 23.1858)",
    border: "oklch(0.2700 0.0090 60)",
    "font-sans": '"Plus Jakarta Sans", ui-sans-serif, sans-serif',
    "font-mono": '"IBM Plex Mono", ui-monospace, monospace',
    radius: "1rem",
  },
};

export function pickVars(
  theme: Theme,
  mode: "light" | "dark",
): PreviewVars | null {
  const v = mode === "dark" ? theme.cssVars.dark : theme.cssVars.light;
  const t = theme.cssVars.theme ?? {};
  if (!v.background || !v.foreground || !v.primary) return null;
  return {
    background: v.background,
    foreground: v.foreground,
    card: v.card ?? v.background,
    "card-foreground": v["card-foreground"] ?? v.foreground,
    primary: v.primary,
    "primary-foreground": v["primary-foreground"] ?? v.background,
    muted: v.muted ?? v.background,
    "muted-foreground": v["muted-foreground"] ?? v.foreground,
    accent: v.accent ?? v.primary,
    "accent-foreground": v["accent-foreground"],
    destructive: v.destructive,
    border: v.border ?? v.foreground,
    "font-sans": v["font-sans"] ?? t["font-sans"],
    "font-mono": v["font-mono"] ?? t["font-mono"],
    radius: v.radius ?? t.radius,
  };
}

/** Build a PreviewVars block from the user's per-var overrides, falling
 *  back to the default-theme value for any role they haven't touched —
 *  so the Custom tile always paints with all the slots filled in. */
export function customVarsFromOverrides(
  overrides: Record<string, string | undefined>,
  mode: "light" | "dark",
): PreviewVars {
  const base = DEFAULT_VARS[mode];
  return {
    background: overrides["--background"] ?? base.background,
    foreground: overrides["--foreground"] ?? base.foreground,
    card: overrides["--card"] ?? base.card,
    "card-foreground":
      overrides["--card-foreground"] ?? base["card-foreground"],
    primary: overrides["--primary"] ?? base.primary,
    "primary-foreground":
      overrides["--primary-foreground"] ?? base["primary-foreground"],
    muted: overrides["--muted"] ?? base.muted,
    "muted-foreground":
      overrides["--muted-foreground"] ?? base["muted-foreground"],
    accent: overrides["--accent"] ?? base.accent,
    "accent-foreground":
      overrides["--accent-foreground"] ?? base["accent-foreground"],
    destructive: overrides["--ft-passage-error"] ?? base.destructive,
    border: overrides["--border"] ?? base.border,
    "font-sans": overrides["--ft-font-family"] ?? base["font-sans"],
    "font-mono": overrides["--ft-font-family"] ?? base["font-mono"],
    radius: overrides["--radius"] ?? base.radius,
  };
}

/** Resolve the radius value to a usable CSS length. Themes may ship
 *  `radius` in `rem`, `px`, or any other CSS unit; treat absent as the
 *  flinttype default. */
export function resolveRadius(vars: PreviewVars): string {
  return vars.radius ?? "0.375rem";
}
