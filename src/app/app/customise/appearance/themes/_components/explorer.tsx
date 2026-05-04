"use client";

import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";

const DEFAULT_VARS = {
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
    border: "oklch(0.86 0.02 60)",
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
    border: "oklch(0.32 0.02 35)",
  },
} as const;

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
  border: string;
};

function pickVars(theme: Theme, mode: "light" | "dark"): PreviewVars | null {
  const v = mode === "dark" ? theme.cssVars.dark : theme.cssVars.light;
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
    border: v.border ?? v.foreground,
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Themes
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Each theme repaints the whole app — passages, buttons, stats, charts. Tap one to preview live.
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

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {entries.map((e) => {
          if (e.kind === "default") {
            return (
              <li key="default">
                <ThemeTile
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
                <ReactiveTile
                  active={e.active}
                  onPick={() => handlePick(BACKGROUND_REACTIVE_ID)}
                />
              </li>
            );
          }
          return (
            <li key={e.theme.id}>
              <ThemeTile
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

/** Tile shell — handles selection ring, focus, click. The painted body
 *  is rendered as children so theme-specific tiles (Reactive) can swap
 *  it without losing the chrome. */
function TileShell({
  active,
  onPick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onPick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group relative block w-full overflow-hidden rounded-md border text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-foreground/30",
      )}
    >
      {children}
      {active ? (
        <span className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check size={12} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

/** Compact theme preview. Mobile: name + sample line + swatches. Desktop
 *  (sm+): adds a primary button, a muted chip, and a stat number to make
 *  the theme's intent legible. */
function ThemeTile({
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
  return (
    <TileShell active={active} onPick={onPick} ariaLabel={`Apply ${name} theme`}>
      <div
        className="flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-3.5"
        style={{ backgroundColor: vars.background, color: vars.foreground }}
      >
        {/* Header: name */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: vars["muted-foreground"] }}
          >
            {name}
          </span>
        </div>

        {/* Sample passage — always visible. Mirrors the typing area:
            muted bulk + foreground next-word + primary current-word. */}
        <p className="font-mono text-[11px] leading-snug sm:text-[12px]">
          <span style={{ color: vars["muted-foreground"] }}>the </span>
          <span style={{ color: vars.foreground }}>quick </span>
          <span
            style={{
              color: vars.primary,
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "3px",
            }}
          >
            brown
          </span>
          <span style={{ color: vars["muted-foreground"] }}> fox</span>
        </p>

        {/* Stat + chips — sm+ only. Demonstrates primary button colour,
            muted surface, and stat tabular-nums in one row. */}
        <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
            }}
          >
            start
          </span>
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em]"
            style={{
              backgroundColor: vars.muted,
              color: vars["muted-foreground"],
            }}
          >
            esc
          </span>
          <span className="ml-auto inline-flex items-baseline gap-1">
            <span
              className="text-base font-bold tabular-nums leading-none"
              style={{ color: vars.primary }}
            >
              82
            </span>
            <span
              className="text-[8px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: vars["muted-foreground"] }}
            >
              wpm
            </span>
          </span>
        </div>

        {/* Input track — sm+ only. Shows muted surface + foreground caret. */}
        <div
          className="hidden h-1.5 w-full overflow-hidden rounded-full sm:block"
          style={{ backgroundColor: vars.muted }}
          aria-hidden
        >
          <span
            className="block h-full"
            style={{ width: "62%", backgroundColor: vars.primary }}
          />
        </div>

        {/* Swatch strip — always visible, summarises the palette. */}
        <Swatches vars={vars} />
      </div>
    </TileShell>
  );
}

function Swatches({ vars }: { vars: PreviewVars }) {
  const cols = [
    vars.background,
    vars.card,
    vars.muted,
    vars.accent,
    vars.primary,
    vars.foreground,
  ];
  return (
    <span
      className="flex h-2 w-full overflow-hidden rounded-sm"
      style={{ outline: `1px solid ${vars.border}` }}
      aria-hidden
    >
      {cols.map((c, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="block h-full flex-1"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

/** Reactive — wildcard tile. No fixed colours; renders an ember/violet
 *  gradient and a short caption so users understand the sampling. */
function ReactiveTile({
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
    >
      <div
        className="flex flex-col gap-2 p-3 text-white sm:gap-2.5 sm:p-3.5"
        style={{ background: grad }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Reactive
          </span>
          <span className="rounded-sm border border-white/30 bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm">
            Auto
          </span>
        </div>

        <p className="font-mono text-[11px] leading-snug text-white/90 sm:text-[12px]">
          sampled from your background image
        </p>

        <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
          <span className="rounded-sm border border-white/30 bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
            live
          </span>
          <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/80">
            on change
          </span>
        </div>

        <div className="hidden h-1.5 w-full overflow-hidden rounded-full bg-white/15 sm:block" aria-hidden>
          <span className="block h-full w-3/4 bg-white/70" />
        </div>

        <span
          className="flex h-2 w-full overflow-hidden rounded-sm"
          style={{ outline: "1px solid rgba(255,255,255,0.3)", background: grad }}
          aria-hidden
        />
      </div>
    </TileShell>
  );
}
