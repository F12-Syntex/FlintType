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
    border: v.border ?? v.foreground,
    "font-sans": v["font-sans"] ?? t["font-sans"],
    "font-mono": v["font-mono"] ?? t["font-mono"],
    radius: v.radius ?? t.radius,
  };
}

type Entry =
  | { kind: "default"; vars: PreviewVars; active: boolean }
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
    if (t.id === BACKGROUND_REACTIVE_ID) continue;
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

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => {
          if (e.kind === "default") {
            return (
              <li key="default">
                <ThemeWindow
                  name="Default"
                  vars={e.vars}
                  active={e.active}
                  onPick={() => handlePick(null)}
                />
              </li>
            );
          }
          return (
            <li key={e.theme.id}>
              <ThemeWindow
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

/** Theme tile rendered as a miniature browser-window screenshot of the
 *  app under the candidate theme. Top: traffic-light dots + URL pill.
 *  Body: a faux flinttype app — wordmark, an in-progress passage that
 *  shows typed (foreground) vs untyped (muted) glyphs, a stats strip,
 *  and a primary CTA. Every colour, font, and radius reads from the
 *  theme's own tokens, so the tile *is* the preview. */
function ThemeWindow({
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
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={`Apply ${name} theme`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-md border text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary ring-2 ring-primary/40"
          : "border-border hover:border-foreground/30",
      )}
    >
      <div
        className="flex aspect-[4/3] flex-col"
        style={{ backgroundColor: vars.background, color: vars.foreground }}
      >
        {/* Window chrome — traffic-light dots + URL pill + active flag. */}
        <div
          className="flex shrink-0 items-center gap-2 border-b px-3 py-2"
          style={{ backgroundColor: vars.card, borderColor: vars.border }}
        >
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: vars.primary }}
            />
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: vars.accent }}
            />
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: vars["muted-foreground"], opacity: 0.6 }}
            />
          </span>
          <span
            className="ml-1 hidden flex-1 truncate px-2 py-[2px] text-[9px] font-medium tracking-[0.06em] sm:block"
            style={{
              backgroundColor: vars.muted,
              color: vars["muted-foreground"],
              borderRadius: radius,
              fontFamily: mono,
            }}
          >
            flinttype.app/{name.toLowerCase().replace(/\s+/g, "-")}
          </span>
          {active ? (
            <span
              className="ml-auto flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] sm:ml-0"
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
        </div>

        {/* App topbar — wordmark + nav + faux user dot. */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-1.5"
          style={{ borderColor: vars.border }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: cardFg, fontFamily: sans }}
          >
            flinttype
          </span>
          <span
            className="hidden items-center gap-2.5 text-[8px] uppercase tracking-[0.16em] sm:flex"
            style={{ color: vars["muted-foreground"], fontFamily: sans }}
          >
            <span style={{ color: cardFg }}>Practice</span>
            <span>Results</span>
            <span>Settings</span>
          </span>
          <span
            aria-hidden
            className="block h-3.5 w-3.5"
            style={{ backgroundColor: vars.primary, borderRadius: radius }}
          />
        </div>

        {/* Passage — the heart of the preview. Typed glyphs paint with
         *  --foreground, untyped with --muted-foreground, the next
         *  character with --primary so the brand spark is visible. */}
        <div
          className="flex-1 px-3.5 py-3 leading-relaxed"
          style={{ fontFamily: mono, fontSize: "12px" }}
        >
          <span style={{ color: vars.foreground }}>The quick&nbsp;</span>
          <span
            style={{
              color: vars.primary,
              borderBottom: `1.5px solid ${vars.primary}`,
            }}
          >
            b
          </span>
          <span style={{ color: vars["muted-foreground"] }}>
            rown fox jumps over the lazy dog every single morning.
          </span>
        </div>

        {/* Stats strip + primary CTA — pinned to bottom on a card-toned
         *  surface so the row reads as a footer toolbar. */}
        <div
          className="mt-auto flex shrink-0 items-center gap-2 border-t px-3 py-2"
          style={{ backgroundColor: vars.card, borderColor: vars.border }}
        >
          <Stat label="WPM" value="92" cardFg={cardFg} muted={vars["muted-foreground"]} mono={mono} />
          <span
            aria-hidden
            className="block h-3 w-px"
            style={{ backgroundColor: vars.border }}
          />
          <Stat label="ACC" value="98%" cardFg={cardFg} muted={vars["muted-foreground"]} mono={mono} />
          <span
            aria-hidden
            className="block h-3 w-px"
            style={{ backgroundColor: vars.border }}
          />
          <Stat
            label="STR"
            value="14"
            cardFg={vars.primary}
            muted={vars["muted-foreground"]}
            mono={mono}
          />
          <span
            className="ml-auto inline-flex items-center justify-center px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] leading-none"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
              borderRadius: radius,
              fontFamily: sans,
            }}
          >
            Restart
          </span>
        </div>

        {/* Theme name footer — ribbon outside the window content so the
         *  preview itself stays clean. */}
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-1.5"
          style={{
            backgroundColor: vars.muted,
            borderColor: vars.border,
            color: vars["muted-foreground"],
          }}
        >
          <span
            className="truncate text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: cardFg, fontFamily: sans }}
            title={name}
          >
            {name}
          </span>
          <span
            className="shrink-0 px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: vars.accent,
              color: accentFg,
              borderRadius: radius,
              fontFamily: mono,
            }}
          >
            r {radius.replace("rem", "")}
          </span>
        </div>
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  cardFg,
  muted,
  mono,
}: {
  label: string;
  value: string;
  cardFg: string;
  muted: string;
  mono: string | undefined;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span
        className="text-[9px] uppercase tracking-[0.16em]"
        style={{ color: muted, fontFamily: mono }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-bold tabular-nums leading-none"
        style={{ color: cardFg, fontFamily: mono }}
      >
        {value}
      </span>
    </span>
  );
}
