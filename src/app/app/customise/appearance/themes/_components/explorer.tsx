"use client";

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

  const totalCount = entries.length;
  const activeName =
    activeId === null
      ? "Default"
      : themes.find((t) => t.id === activeId)?.name ?? "—";

  return (
    <section className="text-foreground">
      <header className="mb-6 border-b border-border pb-5 sm:mb-8 sm:pb-6">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Appearance
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Themes</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Each theme repaints the whole app — palette, typography, and radius. Tap one to preview live.
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="flex items-baseline gap-1.5">
            <span className="text-foreground tabular-nums text-sm font-semibold">
              {totalCount}
            </span>
            <span>themes</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span>active</span>
            <span className="text-foreground font-semibold normal-case tracking-normal">
              {activeName}
            </span>
          </span>
        </div>
      </header>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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

/** Tile shell — selection state, focus ring, click. The interior is
 *  unframed: no window chrome, no bottom name ribbon. The theme name
 *  is a caption below the preview frame. */
function TileShell({
  active,
  onPick,
  ariaLabel,
  children,
  caption,
  captionTone,
}: {
  active: boolean;
  onPick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  caption: React.ReactNode;
  captionTone: "default" | "ember";
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group block w-full text-left transition-all",
        "focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-md border transition-all",
          active
            ? "border-primary ring-2 ring-primary/40"
            : "border-border group-hover:border-foreground/30",
        )}
      >
        {children}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span
          className={cn(
            "truncate text-[11px] font-semibold uppercase tracking-[0.16em]",
            captionTone === "ember" ? "text-primary" : "text-foreground",
          )}
        >
          {caption}
        </span>
        {active ? (
          <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
            <span aria-hidden className="block h-1 w-1 rounded-full bg-primary" />
            Active
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** Theme preview — a frameless slice of the app under the candidate
 *  theme. No window chrome, no footer ribbon. Inside: a display
 *  glyph, the practice passage (typed / next / untyped), a stat
 *  strip, a primary CTA, and an accent badge. Every paint comes from
 *  the theme's own tokens. */
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
  const accentFg = vars["accent-foreground"] ?? vars.foreground;

  return (
    <TileShell
      active={active}
      onPick={onPick}
      ariaLabel={`Apply ${name} theme`}
      caption={name}
      captionTone="default"
    >
      <div
        className="flex aspect-[5/4] flex-col gap-3 px-3 py-3"
        style={{ backgroundColor: vars.background, color: vars.foreground }}
      >
        {/* Display glyph — shows the theme's heading/serif weight at a
         *  size you can read on a small tile. Tag chip floats opposite
         *  to balance the row. */}
        <div className="flex shrink-0 items-start justify-between gap-2">
          <span
            className="leading-none"
            style={{
              fontFamily: sans,
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: vars.foreground,
            }}
          >
            Aa
          </span>
          <span
            className="shrink-0 px-1.5 py-[2px] text-[8px] font-semibold uppercase tracking-[0.16em] leading-none"
            style={{
              backgroundColor: vars.accent,
              color: accentFg,
              borderRadius: radius,
              fontFamily: mono,
            }}
          >
            Practice
          </span>
        </div>

        {/* Reader text — mirrors passage.tsx's three roles: typed
         *  (--ft-passage-typed → primary), error (--ft-passage-error
         *  → destructive), and untyped (--ft-passage-untyped →
         *  muted-foreground). */}
        <p
          className="leading-relaxed"
          style={{ fontFamily: mono, fontSize: "11px" }}
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

        {/* Stat strip — tabular WPM/ACC, with the streak in primary so
         *  the brand spark is in the row. */}
        <div
          className="flex shrink-0 items-baseline gap-3 border-y px-2 py-1.5"
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

        {/* Components row — primary CTA, secondary chip, swatch dots
         *  for primary/accent/muted-foreground so the palette breadth
         *  shows even in this compact slot. */}
        <div className="mt-auto flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] leading-none"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
              borderRadius: radius,
              fontFamily: sans,
            }}
          >
            Restart
          </span>
          <span
            className="inline-flex items-center justify-center px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em] leading-none"
            style={{
              backgroundColor: vars.muted,
              color: vars["muted-foreground"],
              borderRadius: radius,
              fontFamily: sans,
              border: `1px solid ${vars.border}`,
            }}
          >
            60s
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1" aria-hidden>
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars.primary }}
            />
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars.accent }}
            />
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars["muted-foreground"] }}
            />
          </span>
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

/** Reactive — wildcard tile rendered as the same frameless preview but
 *  painted from a synthetic gradient sample. Same body components so it
 *  reads as a peer of the static themes. */
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
      caption="Reactive"
      captionTone="ember"
    >
      <div
        className="flex aspect-[5/4] flex-col gap-3 px-3 py-3 text-white"
        style={{ background: grad }}
      >
        <div className="flex shrink-0 items-start justify-between gap-2">
          <span
            className="leading-none"
            style={{
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            Aa
          </span>
          <span className="shrink-0 rounded-md border border-white/30 bg-white/15 px-1.5 py-[2px] text-[8px] font-semibold uppercase tracking-[0.16em] leading-none text-white/85 backdrop-blur-sm">
            Auto
          </span>
        </div>

        <p
          className="leading-relaxed"
          style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace" }}
        >
          <span className="text-white">The quick&nbsp;</span>
          <span className="border-b border-white/90 text-white">b</span>
          <span className="text-white/65">
            rown fox jumps over the lazy dog.
          </span>
        </p>

        <div className="flex shrink-0 items-baseline gap-3 border-y border-white/15 bg-black/20 px-2 py-1.5 backdrop-blur-sm">
          <ReactiveStat label="WPM" value="92" />
          <ReactiveStat label="ACC" value="98%" />
          <ReactiveStat label="STR" value="14" emphasis />
        </div>

        <div className="mt-auto flex shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center justify-center rounded-md bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] leading-none text-black">
            Restart
          </span>
          <span className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em] leading-none text-white/85">
            60s
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1" aria-hidden>
            <span className="block h-2 w-2 rounded-full bg-white/90" />
            <span className="block h-2 w-2 rounded-full bg-white/55" />
            <span className="block h-2 w-2 rounded-full bg-white/30" />
          </span>
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
