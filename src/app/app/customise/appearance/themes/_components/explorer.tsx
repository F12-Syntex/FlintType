"use client";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";

/** Default-theme preview shape. The default palette has no community
 *  theme entry, so we hand-roll a PreviewVars block matching it. */
const DEFAULT_VARS: Record<"light" | "dark", PreviewVars> = {
  light: {
    background: "oklch(0.9450 0.0180 85)",
    foreground: "oklch(0.18 0.04 35)",
    card: "oklch(0.9650 0.0150 85)",
    "card-foreground": "oklch(0.18 0.04 35)",
    primary: "oklch(0.6551 0.2312 34.7438)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.3717 0.0392 257.2870)",
    "secondary-foreground": "oklch(0.96 0.01 85)",
    muted: "oklch(0.9300 0.0190 85)",
    "muted-foreground": "oklch(0.45 0.04 35)",
    accent: "oklch(0.9656 0.0176 39.4009)",
    "accent-foreground": "oklch(0.18 0.04 35)",
    destructive: "oklch(0.5800 0.2200 27)",
    border: "oklch(0.86 0.02 60)",
    "chart-1": "oklch(0.6551 0.2312 34.7438)",
    "chart-2": "oklch(0.55 0.18 60)",
    "chart-3": "oklch(0.65 0.13 200)",
    "chart-4": "oklch(0.6 0.15 280)",
    "chart-5": "oklch(0.55 0.18 145)",
    "font-sans": "JetBrains Mono, ui-monospace, monospace",
    "font-serif": "Georgia, serif",
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
    secondary: "oklch(0.30 0.04 257)",
    "secondary-foreground": "oklch(0.96 0.012 85)",
    muted: "oklch(0.24 0.02 35)",
    "muted-foreground": "oklch(0.72 0.02 60)",
    accent: "oklch(0.30 0.05 35)",
    "accent-foreground": "oklch(0.96 0.012 85)",
    destructive: "oklch(0.6 0.2 27)",
    border: "oklch(0.32 0.02 35)",
    "chart-1": "oklch(0.7300 0.2000 34.7438)",
    "chart-2": "oklch(0.65 0.18 60)",
    "chart-3": "oklch(0.7 0.13 200)",
    "chart-4": "oklch(0.65 0.15 280)",
    "chart-5": "oklch(0.65 0.18 145)",
    "font-sans": "JetBrains Mono, ui-monospace, monospace",
    "font-serif": "Georgia, serif",
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
  secondary?: string;
  "secondary-foreground"?: string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground"?: string;
  destructive?: string;
  border: string;
  "chart-1"?: string;
  "chart-2"?: string;
  "chart-3"?: string;
  "chart-4"?: string;
  "chart-5"?: string;
  "font-sans"?: string;
  "font-serif"?: string;
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
    secondary: v.secondary,
    "secondary-foreground": v["secondary-foreground"],
    muted: v.muted ?? v.background,
    "muted-foreground": v["muted-foreground"] ?? v.foreground,
    accent: v.accent ?? v.primary,
    "accent-foreground": v["accent-foreground"],
    destructive: v.destructive,
    border: v.border ?? v.foreground,
    "chart-1": v["chart-1"],
    "chart-2": v["chart-2"],
    "chart-3": v["chart-3"],
    "chart-4": v["chart-4"],
    "chart-5": v["chart-5"],
    "font-sans": v["font-sans"] ?? t["font-sans"],
    "font-serif": v["font-serif"] ?? t["font-serif"],
    "font-mono": v["font-mono"] ?? t["font-mono"],
    radius: v.radius ?? t.radius,
  };
}

/** First family in a font-stack — what the eyebrow displays. */
function fontLabel(stack: string | undefined, fallback: string): string {
  if (!stack) return fallback;
  const first = stack.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  return first || fallback;
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
 *  expressed by a thicker primary border + a left accent rail flush
 *  against the inner border, plus an ACTIVE eyebrow inside the title
 *  bar (no floating tick, nothing overlapping the preview). */
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
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px] bg-primary"
        />
      ) : null}
      {children}
    </button>
  );
}

/** Theme card — designed as a designer's swatch card, not a screen
 *  mock. Three vertical zones:
 *    1. Title bar: theme name + ACTIVE eyebrow.
 *    2. Typography sample: large `Aa` glyph in font-serif, smaller `Aa`
 *       in font-sans, plus a font-name eyebrow that names the actual
 *       families this theme installs.
 *    3. Palette grid: 8 swatches covering every load-bearing token,
 *       a chart-1..5 dot row, and a UI atoms strip (button, badge,
 *       destructive dot) so reuse of these tokens is visible.
 *    The radius-token pillbox in the corner reuses the theme's own
 *    --radius so the geometry of every theme reads at a glance. */
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
  const sansLabel = fontLabel(vars["font-sans"], "sans");
  const serifLabel = fontLabel(vars["font-serif"], "serif");
  const monoLabel = fontLabel(vars["font-mono"], "mono");
  const radius = vars.radius ?? "0.5rem";
  const charts = (
    [vars["chart-1"], vars["chart-2"], vars["chart-3"], vars["chart-4"], vars["chart-5"]]
      .filter(Boolean) as string[]
  );
  const swatches: Array<{ key: string; color: string; label: string }> = [
    { key: "primary", color: vars.primary, label: "PRI" },
    { key: "secondary", color: vars.secondary ?? vars.muted, label: "SEC" },
    { key: "accent", color: vars.accent, label: "ACC" },
    { key: "destructive", color: vars.destructive ?? vars.primary, label: "DST" },
    { key: "card", color: vars.card, label: "CRD" },
    { key: "muted", color: vars.muted, label: "MUT" },
    { key: "border", color: vars.border, label: "BRD" },
    { key: "foreground", color: vars.foreground, label: "FG " },
  ];

  return (
    <TileShell active={active} onPick={onPick} ariaLabel={`Apply ${name} theme`}>
      <div
        className="flex aspect-square flex-col"
        style={{ backgroundColor: vars.background }}
      >
        {/* Title bar — sits on the card surface so it reads as a
            distinct band against the page background. */}
        <div
          className="flex shrink-0 items-center gap-2 border-b px-2.5 py-1.5"
          style={{
            backgroundColor: vars.card,
            borderColor: vars.border,
          }}
        >
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
          ) : (
            <span className="flex shrink-0 gap-1" aria-hidden>
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
                style={{
                  backgroundColor: vars.destructive ?? vars["muted-foreground"],
                }}
              />
            </span>
          )}
          <span
            className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              color: vars["card-foreground"] ?? vars.foreground,
              fontFamily: vars["font-sans"],
            }}
          >
            {name}
          </span>
        </div>

        {/* Typography zone — `Aa` paired in serif and sans, font-name
            eyebrow underneath so the typeface registers immediately. */}
        <div
          className="flex shrink-0 items-end justify-between gap-2 px-3 pt-3"
          style={{ color: vars.foreground }}
        >
          <span className="flex items-baseline gap-2">
            <span
              className="leading-none"
              style={{
                fontFamily: vars["font-serif"],
                fontSize: "32px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              Aa
            </span>
            <span
              className="leading-none"
              style={{
                fontFamily: vars["font-sans"],
                fontSize: "20px",
                fontWeight: 600,
                color: vars["muted-foreground"],
              }}
            >
              Aa
            </span>
          </span>
          {/* Radius pill — uses the theme's --radius so the geometry
              shows. */}
          <span
            className="shrink-0 px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-[0.14em]"
            style={{
              borderRadius: radius,
              backgroundColor: vars.muted,
              color: vars["muted-foreground"],
              border: `1px solid ${vars.border}`,
              fontFamily: vars["font-mono"],
            }}
          >
            r {radius.replace("rem", "")}
          </span>
        </div>

        {/* Font-name eyebrow — three families one line, truncated. */}
        <div
          className="mt-1 flex shrink-0 items-baseline gap-1.5 truncate px-3 text-[8px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: vars["muted-foreground"] }}
        >
          <span
            className="truncate"
            style={{ fontFamily: vars["font-sans"] }}
            title={sansLabel}
          >
            {sansLabel}
          </span>
          <span aria-hidden style={{ opacity: 0.5 }}>
            ·
          </span>
          <span
            className="truncate"
            style={{ fontFamily: vars["font-serif"] }}
            title={serifLabel}
          >
            {serifLabel}
          </span>
          <span aria-hidden style={{ opacity: 0.5 }}>
            ·
          </span>
          <span
            className="truncate"
            style={{ fontFamily: vars["font-mono"] }}
            title={monoLabel}
          >
            {monoLabel}
          </span>
        </div>

        {/* Palette grid — 4×2 swatches showing the load-bearing tokens. */}
        <div className="mt-2 grid shrink-0 grid-cols-4 gap-1 px-3">
          {swatches.map((s) => (
            <div
              key={s.key}
              className="flex aspect-[1.6/1] flex-col justify-end overflow-hidden border p-1"
              style={{
                backgroundColor: s.color,
                borderColor: vars.border,
                borderRadius: radius,
              }}
            >
              <span
                className="text-[7px] font-bold uppercase tracking-[0.12em] leading-none"
                style={{
                  color: contrastInk(
                    s.color,
                    vars.foreground,
                    vars.background,
                    vars["primary-foreground"],
                  ),
                  fontFamily: vars["font-mono"],
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Chart-1..5 dot row — secondary identifier for themes that
            ship a richer chart palette. Falls back to a thin band of
            primary if a theme has no chart vars. */}
        {charts.length >= 3 ? (
          <div className="mt-2 flex shrink-0 items-center gap-1 px-3">
            {charts.map((c, i) => (
              <span
                key={i}
                className="block h-1.5 flex-1"
                style={{ backgroundColor: c, borderRadius: radius }}
              />
            ))}
          </div>
        ) : null}

        {/* UI atoms strip — primary button, accent badge, destructive
            dot. Pinned to the bottom so every tile lines up. */}
        <div
          className="mt-auto flex shrink-0 items-center gap-1.5 border-t px-3 py-2"
          style={{
            backgroundColor: vars.card,
            borderColor: vars.border,
          }}
        >
          <span
            className="inline-flex items-center justify-center px-2 py-[3px] text-[8px] font-semibold uppercase tracking-[0.12em] leading-none"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
              borderRadius: radius,
              fontFamily: vars["font-sans"],
            }}
          >
            Action
          </span>
          <span
            className="inline-flex items-center justify-center px-1.5 py-[2px] text-[8px] font-semibold uppercase tracking-[0.12em] leading-none"
            style={{
              backgroundColor: vars.accent,
              color: vars["accent-foreground"] ?? vars.foreground,
              borderRadius: radius,
              fontFamily: vars["font-sans"],
              border: `1px solid ${vars.border}`,
            }}
          >
            Tag
          </span>
          {vars.destructive ? (
            <span
              aria-hidden
              className="ml-auto block h-2 w-2"
              style={{
                backgroundColor: vars.destructive,
                borderRadius: radius,
              }}
            />
          ) : null}
        </div>
      </div>
    </TileShell>
  );
}

/** Pick the better-contrast text colour for a swatch label.
 *  Naive luminance — good enough for ~12-pixel labels. */
function contrastInk(
  swatch: string,
  fg: string,
  bg: string,
  primaryFg: string,
): string {
  const lum = oklchLightness(swatch);
  if (lum === null) return fg;
  if (lum > 0.6) return fg.includes("oklch") ? darkenInk(fg, bg) : fg;
  return primaryFg;
}

function oklchLightness(color: string): number | null {
  const m = color.match(/oklch\(\s*([0-9.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  return n > 1 ? n / 100 : n;
}

/** Returns whichever of fg/bg is darker — used as the label colour on
 *  bright swatches so the small mono text stays readable. */
function darkenInk(fg: string, bg: string): string {
  const fgL = oklchLightness(fg) ?? 0;
  const bgL = oklchLightness(bg) ?? 1;
  return fgL < bgL ? fg : bg;
}

/** Reactive — wildcard tile. Keeps the typography + palette card
 *  shape so it reads as a peer of the others, but the swatches are
 *  replaced by a gradient sample. */
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
          {active ? (
            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
              <span aria-hidden className="block h-1 w-1 rounded-full bg-white" />
              Active
            </span>
          ) : (
            <span className="flex shrink-0 gap-1" aria-hidden>
              <span className="block h-2 w-2 rounded-full bg-white/80" />
              <span className="block h-2 w-2 rounded-full bg-white/55" />
              <span className="block h-2 w-2 rounded-full bg-white/30" />
            </span>
          )}
          <span className="ml-auto truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
            Reactive
          </span>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-2 px-3 pt-3">
          <span className="flex items-baseline gap-2 text-white">
            <span
              className="leading-none"
              style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em" }}
            >
              Aa
            </span>
            <span
              className="leading-none text-white/70"
              style={{ fontSize: "20px", fontWeight: 600 }}
            >
              Aa
            </span>
          </span>
          <span className="shrink-0 rounded-md border border-white/30 bg-white/15 px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm">
            auto
          </span>
        </div>

        <div className="mt-1 truncate px-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/65">
          sampled · live · adaptive
        </div>

        {/* Gradient swatch grid — cells slide along the same gradient
            so the tile reads as 'a palette generated for you'. */}
        <div className="mt-2 grid shrink-0 grid-cols-4 gap-1 px-3">
          {[0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1].map((stop, i) => (
            <div
              key={i}
              className="aspect-[1.6/1] overflow-hidden rounded-md border border-white/20"
              style={{
                background: grad,
                backgroundSize: "400% 100%",
                backgroundPosition: `${stop * 100}% 50%`,
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex shrink-0 items-center gap-1 px-3">
          {[
            "oklch(0.62 0.22 35)",
            "oklch(0.55 0.22 60)",
            "oklch(0.50 0.20 200)",
            "oklch(0.45 0.20 260)",
            "oklch(0.40 0.18 280)",
          ].map((c, i) => (
            <span
              key={i}
              className="block h-1.5 flex-1 rounded-md"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="mt-auto flex shrink-0 items-center gap-1.5 border-t border-white/15 bg-black/20 px-3 py-2 backdrop-blur-sm">
          <span className="inline-flex items-center justify-center rounded-md bg-white px-2 py-[3px] text-[8px] font-semibold uppercase tracking-[0.12em] leading-none text-black">
            Sample
          </span>
          <span className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-1.5 py-[2px] text-[8px] font-semibold uppercase tracking-[0.12em] leading-none text-white/85">
            Live
          </span>
          <span aria-hidden className="ml-auto block h-2 w-2 rounded-full bg-white/80" />
        </div>
      </div>
    </TileShell>
  );
}
