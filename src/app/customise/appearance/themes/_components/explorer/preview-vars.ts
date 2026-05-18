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
    foreground: "oklch(0.18 0.04 35)",
    card: "oklch(0.9650 0.0150 85)",
    "card-foreground": "oklch(0.18 0.04 35)",
    primary: "oklch(0.6551 0.2312 34.7438)",
    "primary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.9300 0.0190 85)",
    "muted-foreground": "oklch(0.45 0.04 35)",
    accent: "oklch(0.9656 0.0176 39.4009)",
    "accent-foreground": "oklch(0.18 0.04 35)",
    destructive: "oklch(0.5800 0.2200 27)",
    border: "oklch(0.86 0.02 60)",
    "font-sans": "JetBrains Mono, ui-monospace, monospace",
    "font-mono": "JetBrains Mono, ui-monospace, monospace",
    radius: "0.375rem",
  },
  dark: {
    background: "oklch(0.16 0.02 35)",
    foreground: "oklch(0.96 0.012 85)",
    card: "oklch(0.20 0.02 35)",
    "card-foreground": "oklch(0.96 0.012 85)",
    primary: "oklch(0.7300 0.2000 34.7438)",
    "primary-foreground": "oklch(0.16 0.02 35)",
    muted: "oklch(0.24 0.02 35)",
    "muted-foreground": "oklch(0.72 0.02 60)",
    accent: "oklch(0.30 0.05 35)",
    "accent-foreground": "oklch(0.96 0.012 85)",
    destructive: "oklch(0.6 0.2 27)",
    border: "oklch(0.32 0.02 35)",
    "font-sans": "JetBrains Mono, ui-monospace, monospace",
    "font-mono": "JetBrains Mono, ui-monospace, monospace",
    radius: "0.375rem",
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
