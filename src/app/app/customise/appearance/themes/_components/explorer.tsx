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

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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

/** Tile rendered as a faux desktop window: a card-coloured title bar
 *  with traffic-light dots and the theme name, then a square painted
 *  body that previews the typing UI — sample passage, caret, stat
 *  row. Square aspect so tiles read as little app windows. */
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
        className="flex aspect-square flex-col"
        style={{ backgroundColor: vars.background }}
      >
        {/* Window title bar — uses the card surface so it reads as a
            distinct strip atop the page background. */}
        <div
          className="flex shrink-0 items-center gap-2 border-b px-2.5 py-1.5"
          style={{
            backgroundColor: vars.card,
            borderColor: vars.border,
          }}
        >
          <span className="flex shrink-0 gap-1" aria-hidden>
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars["muted-foreground"], opacity: 0.45 }}
            />
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars["muted-foreground"], opacity: 0.45 }}
            />
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: vars.primary }}
            />
          </span>
          <span
            className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: vars["muted-foreground"] }}
          >
            {name}
          </span>
        </div>

        {/* Window body — the typing preview. */}
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 p-3">
          {/* Sample passage — muted bulk, foreground typed, primary
              current-word, with a blinking caret rendered as a thin bar. */}
          <p className="font-mono text-[11px] leading-[1.6] sm:text-[12px]">
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
            <span
              aria-hidden
              className="mx-px inline-block h-[1.05em] w-[2px] translate-y-[2px]"
              style={{ backgroundColor: vars.primary }}
            />
            <span style={{ color: vars["muted-foreground"] }}>fox jumps</span>
          </p>

          {/* Stat row — wpm + accuracy, both tabular-nums. */}
          <div className="flex items-baseline justify-between">
            <span className="inline-flex items-baseline gap-1">
              <span
                className="text-lg font-bold tabular-nums leading-none sm:text-xl"
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
            <span className="inline-flex items-baseline gap-1">
              <span
                className="text-sm font-semibold tabular-nums leading-none"
                style={{ color: vars.foreground }}
              >
                97
              </span>
              <span
                className="text-[8px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: vars["muted-foreground"] }}
              >
                %
              </span>
            </span>
          </div>

          {/* Progress track — muted surface, primary fill. */}
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: vars.muted }}
            aria-hidden
          >
            <span
              className="block h-full"
              style={{ width: "62%", backgroundColor: vars.primary }}
            />
          </div>
        </div>
      </div>
    </TileShell>
  );
}

/** Reactive — wildcard tile. Same window shape, gradient body. */
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
        className="flex aspect-square flex-col text-white"
        style={{ background: grad }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-white/15 bg-black/20 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="flex shrink-0 gap-1" aria-hidden>
            <span className="block h-2 w-2 rounded-full bg-white/40" />
            <span className="block h-2 w-2 rounded-full bg-white/40" />
            <span className="block h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Reactive
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2 p-3">
          <p className="font-mono text-[11px] leading-[1.6] text-white/85 sm:text-[12px]">
            sampled from your background
          </p>

          <div className="flex items-baseline justify-between">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums leading-none sm:text-xl">
                live
              </span>
            </span>
            <span className="rounded-sm border border-white/30 bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm">
              auto
            </span>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15" aria-hidden>
            <span className="block h-full w-3/4 bg-white/70" />
          </div>
        </div>
      </div>
    </TileShell>
  );
}
