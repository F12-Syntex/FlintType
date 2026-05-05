"use client";

import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";

/** Default-theme preview values — the default palette has no entry in
 *  THEMES (it's just :root + .dark in globals.css), so we hand-roll a
 *  PreviewVars block matching it. Values track globals.css. */
const DEFAULT_VARS: Record<"light" | "dark", PreviewVars> = {
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

type PreviewVars = {
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

function pickVars(theme: Theme, mode: "light" | "dark"): PreviewVars | null {
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

type Entry =
  | { kind: "default"; vars: PreviewVars; active: boolean }
  | { kind: "reactive"; active: boolean }
  | { kind: "theme"; theme: Theme; vars: PreviewVars; active: boolean };

export function ThemeExplorer() {
  const { themes, activeId, apply, reset } = usePalette();
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  function handlePick(id: string | null) {
    if (id === null) reset();
    else apply(id);
  }

  const entries: Entry[] = [
    { kind: "default", vars: DEFAULT_VARS[mode], active: activeId === null },
  ];
  for (const t of themes) {
    if (t.id === BACKGROUND_REACTIVE_ID) {
      entries.push({ kind: "reactive", active: activeId === t.id });
      continue;
    }
    const vars = pickVars(t, mode);
    if (!vars) continue;
    entries.push({ kind: "theme", theme: t, vars, active: activeId === t.id });
  }

  return (
    <section className="text-foreground">
      <header className="mb-6 border-b border-border pb-5 sm:mb-8 sm:pb-6">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Appearance
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Themes
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Each tile is a slice of the app under that theme — palette,
          typography, radius. Tap to apply live.
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {entries.map((e) => {
          if (e.kind === "default") {
            return (
              <li key="default">
                <ThemePreview
                  name="Default"
                  vars={e.vars}
                  active={e.active}
                  onPick={() => handlePick(null)}
                />
              </li>
            );
          }
          if (e.kind === "reactive") {
            return (
              <li key="reactive">
                <ReactivePreview
                  active={e.active}
                  onPick={() => handlePick(BACKGROUND_REACTIVE_ID)}
                />
              </li>
            );
          }
          return (
            <li key={e.theme.id}>
              <ThemePreview
                name={e.theme.name}
                vars={e.vars}
                active={e.active}
                onPick={() => handlePick(e.theme.id)}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Tile shell — bordered card with the rendered preview on top and a
 *  hairline-divided footer band below carrying the theme name and the
 *  active-state chip. The footer keeps the name attached to the tile
 *  (instead of floating below it) so each card reads as one unit, and
 *  hover reveals a quiet "→" arrow on inactive tiles to telegraph the
 *  click affordance. */
function TileShell({
  active,
  onPick,
  ariaLabel,
  children,
  name,
  accentName = false,
}: {
  active: boolean;
  onPick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  name: string;
  /** Paint the name in primary instead of foreground — used by the
   *  Reactive tile so its name carries the brand spark while every
   *  static theme keeps the neutral label. */
  accentName?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group relative block w-full overflow-hidden rounded-md border text-left transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30 hover:shadow-md",
      )}
    >
      {children}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-3 py-2.5">
        <span
          className={cn(
            "truncate text-[12px] font-semibold uppercase tracking-[0.16em]",
            accentName ? "text-primary" : "text-foreground",
          )}
        >
          {name}
        </span>
        {active ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Active
          </span>
        ) : (
          <ArrowRight
            size={14}
            aria-hidden
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-70"
          />
        )}
      </div>
    </button>
  );
}

/** A 4-swatch palette stripe — primary / accent / muted-fg / border —
 *  pinned to the right of the Aa display. Quick visual signal for the
 *  full palette before the eye reaches the passage / stat strip. */
function PaletteStripe({
  vars,
  radius,
}: {
  vars: PreviewVars;
  radius: string;
}) {
  const colors = [
    vars.primary,
    vars.accent,
    vars["muted-foreground"],
    vars.border,
  ];
  return (
    <div className="flex shrink-0 items-center gap-1">
      {colors.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="block size-3.5"
          style={{ backgroundColor: c, borderRadius: radius }}
        />
      ))}
    </div>
  );
}

/** Theme preview — frameless slice of the app under the candidate
 *  theme. Three rows:
 *    1. Aa display + 4-swatch palette stripe
 *    2. The practice passage (typed → primary, error → destructive,
 *       untyped → muted-foreground)
 *    3. WPM / ACC / STR stat strip pinned to the bottom on a card-tinted
 *       hairline band — STR carries the primary spark
 *  The Restart CTA + 60s chip + dot row was removed; it competed with
 *  the rest of the tile and didn't add palette information. */
function ThemePreview({
  name,
  vars,
  active,
  onPick,
}: {
  name: string;
  vars: PreviewVars;
  active: boolean;
  onPick: () => void;
}) {
  const radius = vars.radius ?? "0.5rem";
  const sans = vars["font-sans"];
  const mono = vars["font-mono"] ?? sans;
  const cardFg = vars["card-foreground"] ?? vars.foreground;

  return (
    <TileShell
      active={active}
      onPick={onPick}
      ariaLabel={`Apply ${name} theme`}
      name={name}
    >
      <div
        className="flex aspect-[5/4] flex-col gap-3 px-4 py-4"
        style={{ backgroundColor: vars.background, color: vars.foreground }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="leading-none"
            style={{
              fontFamily: sans,
              fontSize: "36px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: vars.foreground,
            }}
          >
            Aa
          </span>
          <PaletteStripe vars={vars} radius={radius} />
        </div>

        <p
          className="leading-relaxed"
          style={{ fontFamily: mono, fontSize: "12px" }}
        >
          <span style={{ color: vars.primary }}>The quick&nbsp;</span>
          <span
            style={{
              color: vars.destructive ?? vars.primary,
              borderBottom: `1.5px solid ${vars.destructive ?? vars.primary}`,
            }}
          >
            b
          </span>
          <span style={{ color: vars["muted-foreground"] }}>
            rown fox jumps over the lazy dog.
          </span>
        </p>

        <div
          className="mt-auto flex shrink-0 items-baseline gap-3 border-y px-2 py-1.5"
          style={{ borderColor: vars.border, backgroundColor: vars.card }}
        >
          <Stat
            label="WPM"
            value="92"
            valueColor={cardFg}
            muted={vars["muted-foreground"]}
            mono={mono}
          />
          <Stat
            label="ACC"
            value="98%"
            valueColor={cardFg}
            muted={vars["muted-foreground"]}
            mono={mono}
          />
          <Stat
            label="STR"
            value="14"
            valueColor={vars.primary}
            muted={vars["muted-foreground"]}
            mono={mono}
          />
        </div>
      </div>
    </TileShell>
  );
}

function Stat({
  label,
  value,
  valueColor,
  muted,
  mono,
}: {
  label: string;
  value: string;
  valueColor: string;
  muted: string;
  mono: string | undefined;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className="text-[8px] uppercase tracking-[0.18em]"
        style={{ color: muted, fontFamily: mono }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-bold tabular-nums leading-none"
        style={{ color: valueColor, fontFamily: mono }}
      >
        {value}
      </span>
    </span>
  );
}

/** Reactive — wildcard tile rendered in the same shape as a static
 *  theme but painted from a synthetic gradient sample. Same body
 *  components so it reads as a peer. */
function ReactivePreview({
  active,
  onPick,
}: {
  active: boolean;
  onPick: () => void;
}) {
  const grad =
    "linear-gradient(135deg, oklch(0.62 0.22 35) 0%, oklch(0.55 0.22 60) 35%, oklch(0.40 0.18 280) 100%)";
  return (
    <TileShell
      active={active}
      onPick={onPick}
      ariaLabel="Apply background-reactive theme"
      name="Reactive"
      accentName
    >
      <div
        className="flex aspect-[5/4] flex-col gap-3 px-4 py-4 text-white"
        style={{ background: grad }}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="leading-none"
            style={{
              fontSize: "36px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            Aa
          </span>
          <div className="flex shrink-0 items-center gap-1" aria-hidden>
            <span className="block size-3.5 rounded-sm bg-white/95" />
            <span className="block size-3.5 rounded-sm bg-white/65" />
            <span className="block size-3.5 rounded-sm bg-white/40" />
            <span className="block size-3.5 rounded-sm bg-white/20" />
          </div>
        </div>

        <p
          className="leading-relaxed"
          style={{ fontSize: "12px", fontFamily: "ui-monospace, monospace" }}
        >
          <span className="text-white">The quick&nbsp;</span>
          <span className="border-b border-white/90 text-white">b</span>
          <span className="text-white/65">
            rown fox jumps over the lazy dog.
          </span>
        </p>

        <div className="mt-auto flex shrink-0 items-baseline gap-3 border-y border-white/15 bg-black/20 px-2 py-1.5 backdrop-blur-sm">
          <ReactiveStat label="WPM" value="92" />
          <ReactiveStat label="ACC" value="98%" />
          <ReactiveStat label="STR" value="14" emphasis />
        </div>
      </div>
    </TileShell>
  );
}

function ReactiveStat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[8px] uppercase tracking-[0.18em] text-white/65">
        {label}
      </span>
      <span
        className={cn(
          "text-[12px] font-bold tabular-nums leading-none",
          emphasis ? "text-white" : "text-white/90",
        )}
      >
        {value}
      </span>
    </span>
  );
}
