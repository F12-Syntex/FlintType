"use client";

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

/** Tile shell — handles selection state, focus, click. Active state is
 *  expressed by the chrome itself (thicker primary border, a left
 *  accent bar, and a SELECTED eyebrow inside the title bar) instead of
 *  a corner checkmark, so nothing floats over the preview. */
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
          ? "border-primary ring-2 ring-primary/40"
          : "border-border hover:border-foreground/30",
      )}
    >
      {/* Left accent rail — the editorial selection mark. Sits flush
          against the inner border so it never overlaps preview content. */}
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-primary"
        />
      ) : null}
      {children}
    </button>
  );
}

/** Tile rendered as a faux desktop window: a card-coloured title bar
 *  with traffic-light dots and the theme name, then a square painted
 *  body that previews the typing UI — passage, sparkline, stat strip,
 *  keyboard row, and a swatch strip. Selected tiles surface their state
 *  inside the title bar (eyebrow + dot) instead of a floating tick. */
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
        {/* Window title bar — the SELECTED eyebrow replaces the corner
            tick when the theme is active. */}
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
          {active ? (
            <span
              className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: vars.primary }}
            >
              <span
                aria-hidden
                className="block h-1 w-1 rounded-full"
                style={{ backgroundColor: vars.primary }}
              />
              Active
            </span>
          ) : null}
          <span
            className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: vars["muted-foreground"] }}
          >
            {name}
          </span>
        </div>

        {/* Window body — denser typing preview. */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          {/* Sample passage — two lines, with a primary current word
              and a coloured caret bar. */}
          <p className="font-mono text-[11px] leading-[1.55] sm:text-[12px]">
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
            <span style={{ color: vars["muted-foreground"] }}> fox jumps</span>
            <br />
            <span style={{ color: vars["muted-foreground"] }}>over the lazy dog</span>
          </p>

          {/* Sparkline — primary stroke against a faint baseline.
              Pure SVG so it scales with the tile. */}
          <Sparkline vars={vars} />

          {/* Stat strip — 3 stats separated by hairline dividers. */}
          <div
            className="flex items-baseline justify-between rounded-sm px-1.5 py-1"
            style={{ backgroundColor: vars.muted }}
          >
            <Stat value="82" label="wpm" emphasis vars={vars} />
            <span
              aria-hidden
              className="block h-3 w-px"
              style={{ backgroundColor: vars.border }}
            />
            <Stat value="97" label="acc" vars={vars} />
            <span
              aria-hidden
              className="block h-3 w-px"
              style={{ backgroundColor: vars.border }}
            />
            <Stat value="0:42" label="time" vars={vars} />
          </div>

          {/* Mini keycap row — 5 keys, the middle one is the next-expected
              key painted in primary. */}
          <div className="flex shrink-0 items-center gap-1">
            {["A", "S", "D", "F", "G"].map((k, i) => {
              const isNext = i === 2;
              return (
                <span
                  key={k}
                  className="flex h-4 flex-1 items-center justify-center rounded-[2px] border text-[8px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: isNext ? vars.primary : vars.card,
                    color: isNext
                      ? vars["primary-foreground"]
                      : vars.foreground,
                    borderColor: isNext ? vars.primary : vars.border,
                  }}
                >
                  {k}
                </span>
              );
            })}
          </div>

          {/* Swatch strip — surfaces the four most identifying colours
              of the theme so adjacent tiles feel distinct at a glance. */}
          <div
            className="mt-auto flex h-2 shrink-0 overflow-hidden rounded-[2px] border"
            style={{ borderColor: vars.border }}
            aria-hidden
          >
            <span className="flex-1" style={{ backgroundColor: vars.background }} />
            <span className="flex-1" style={{ backgroundColor: vars.card }} />
            <span className="flex-1" style={{ backgroundColor: vars.muted }} />
            <span className="flex-1" style={{ backgroundColor: vars.accent }} />
            <span
              className="flex-[1.5]"
              style={{ backgroundColor: vars.primary }}
            />
          </div>
        </div>
      </div>
    </TileShell>
  );
}

function Stat({
  value,
  label,
  emphasis,
  vars,
}: {
  value: string;
  label: string;
  emphasis?: boolean;
  vars: PreviewVars;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className={cn(
          "tabular-nums leading-none",
          emphasis ? "text-[14px] font-bold" : "text-[12px] font-semibold",
        )}
        style={{ color: emphasis ? vars.primary : vars.foreground }}
      >
        {value}
      </span>
      <span
        className="text-[8px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: vars["muted-foreground"] }}
      >
        {label}
      </span>
    </span>
  );
}

/** WPM-over-time sparkline. 12 fixed sample points so every tile reads
 *  the same shape; only the colours change. */
function Sparkline({ vars }: { vars: PreviewVars }) {
  const points = [42, 58, 51, 64, 72, 68, 78, 74, 82, 79, 85, 82];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 100;
  const h = 24;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const fill = `${path} L${w},${h} L0,${h} Z`;
  const lastX = w;
  const lastY = h - ((points[points.length - 1] - min) / (max - min)) * h;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-6 w-full shrink-0"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={fill} fill={vars.primary} opacity={0.12} />
      <path
        d={path}
        fill="none"
        stroke={vars.primary}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={1.6} fill={vars.primary} />
    </svg>
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
          {active ? (
            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
              <span aria-hidden className="block h-1 w-1 rounded-full bg-white" />
              Active
            </span>
          ) : null}
          <span className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Reactive
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <p className="font-mono text-[11px] leading-[1.55] text-white/85 sm:text-[12px]">
            sampled from your<br />
            background image
          </p>

          {/* Spectrum sparkline standing in for "live colour" */}
          <svg
            viewBox="0 0 100 24"
            className="h-6 w-full shrink-0"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="reactive-spark" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
              </linearGradient>
            </defs>
            <path
              d="M0,18 L8,12 L16,16 L24,8 L32,11 L40,5 L48,9 L56,3 L64,7 L72,4 L80,6 L88,2 L100,4"
              fill="none"
              stroke="url(#reactive-spark)"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="flex items-baseline justify-between rounded-sm bg-white/15 px-1.5 py-1 backdrop-blur-sm">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-[14px] font-bold tabular-nums leading-none">
                live
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/70">
                src
              </span>
            </span>
            <span aria-hidden className="block h-3 w-px bg-white/25" />
            <span className="inline-flex items-baseline gap-1">
              <span className="text-[12px] font-semibold tabular-nums leading-none">
                auto
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/70">
                hue
              </span>
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {["A", "S", "D", "F", "G"].map((k, i) => (
              <span
                key={k}
                className={cn(
                  "flex h-4 flex-1 items-center justify-center rounded-[2px] border text-[8px] font-semibold tabular-nums",
                  i === 2
                    ? "border-white bg-white/90 text-black"
                    : "border-white/30 bg-white/10 text-white/85",
                )}
              >
                {k}
              </span>
            ))}
          </div>

          <div
            aria-hidden
            className="mt-auto h-2 shrink-0 overflow-hidden rounded-[2px] border border-white/30"
            style={{ background: grad }}
          />
        </div>
      </div>
    </TileShell>
  );
}
