"use client";

import { Check } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";

/** Default palette CSS-var values mirrored from globals.css `:root` /
 *  `.dark`. Hardcoded so the Default tile always renders correctly
 *  even when another palette is active — `getComputedStyle(:root)`
 *  would just read the override. */
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
  | {
      kind: "theme";
      theme: Theme;
      vars: PreviewVars;
      active: boolean;
    };

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
      {/* Editorial header — flint voice: small all-caps eyebrow,
          dramatic display, count + active strip beneath. */}
      <header className="mb-10 border-b border-border pb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Flint shop
          </span>
        </div>
        <h1 className="text-4xl font-bold leading-[0.95] tracking-tight sm:text-5xl">
          Pick your spark.
        </h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-baseline gap-2">
            <span className="text-foreground tabular-nums text-base font-bold">
              {totalCount}
            </span>
            <span>flints in stock</span>
          </span>
          <span className="flex items-baseline gap-2">
            <span>now striking</span>
            <span className="text-primary text-base font-bold">·</span>
            <span className="text-foreground font-semibold normal-case tracking-normal">
              {activeName}
            </span>
          </span>
        </div>
      </header>

      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
        {entries.map((e, i) => {
          if (e.kind === "default") {
            return (
              <li key="default" className="bg-background">
                <FlintCard
                  index={i}
                  name="Default"
                  tagline="The house flint"
                  vars={e.vars}
                  active={e.active}
                  onPick={() => handlePick(null)}
                />
              </li>
            );
          }
          if (e.kind === "reactive") {
            return (
              <li key="reactive" className="bg-background">
                <ReactiveFlintCard
                  index={i}
                  active={e.active}
                  onPick={() => handlePick(BACKGROUND_REACTIVE_ID)}
                />
              </li>
            );
          }
          return (
            <li key={e.theme.id} className="bg-background">
              <FlintCard
                index={i}
                name={e.theme.name}
                tagline={e.theme.source ? "Quarried from tweakcn" : "Custom flint"}
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

/** A single flint tile. Editorial, hairline-bordered, mono. The hero
 *  zone paints itself in the theme's own colours; the metadata strip
 *  underneath stays in the app palette so flint names remain
 *  readable across loud themes. Hover lifts the spark dot; active
 *  paints the entire metadata strip in the primary accent. */
function FlintCard({
  index,
  name,
  tagline,
  vars,
  active,
  onPick,
}: {
  index: number;
  name: string;
  tagline: string;
  vars: PreviewVars;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "group relative flex h-full w-full flex-col text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      {/* Hero zone — pure theme paint */}
      <div
        className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden p-5 transition-transform duration-300 group-hover:scale-[1.005]"
        style={{
          backgroundColor: vars.background,
          color: vars.foreground,
        }}
      >
        {/* Index number — large, faint, editorial */}
        <span
          className="absolute top-3 right-4 text-[44px] font-black leading-none tabular-nums opacity-15"
          style={{ color: vars.foreground }}
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Sample passage — mirrors the real app: dim bulk, primary
            accent on a single word, foreground on the next-word. */}
        <p className="relative z-10 max-w-[85%] font-mono text-[13px] leading-[1.7]">
          <span style={{ color: vars["muted-foreground"] }}>strike </span>
          <span style={{ color: vars.foreground }}>twice </span>
          <span
            style={{
              color: vars.primary,
              textDecoration: "underline",
              textDecorationThickness: "1px",
              textUnderlineOffset: "4px",
            }}
          >
            sharp
          </span>
          <span style={{ color: vars["muted-foreground"] }}>
            {" "}— let the spark catch the tinder
          </span>
        </p>

        {/* Bottom rail: stat + caret bar */}
        <div className="relative z-10 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[28px] font-bold tabular-nums tracking-[-0.02em]"
              style={{ color: vars.primary }}
            >
              82
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: vars["muted-foreground"] }}
            >
              wpm
            </span>
          </div>
          <span
            aria-hidden
            className="block h-7 w-[3px]"
            style={{ backgroundColor: vars.primary }}
          />
        </div>
      </div>

      {/* Hairline rule — separator that picks up the theme's foreground */}
      <span
        aria-hidden
        className="block h-px w-full opacity-15"
        style={{ backgroundColor: vars.foreground }}
      />

      {/* Metadata strip — stays in the app palette so names read
          legibly across every theme. */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-t px-4 py-3 transition-colors",
          active
            ? "border-primary bg-primary/8"
            : "border-transparent group-hover:bg-foreground/[0.03]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "block h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
              active ? "bg-primary" : "bg-foreground/30 group-hover:bg-primary",
            )}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight">
              {name}
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {tagline}
            </span>
          </div>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
            <Check size={11} strokeWidth={3} />
            Struck
          </span>
        ) : (
          <Swatches vars={vars} />
        )}
      </div>
    </button>
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
    <span className="flex h-3 shrink-0 overflow-hidden rounded-md border border-border">
      {cols.map((c, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className="block h-full w-2"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

/** Reactive flint — the wildcard tile. No fixed colours; renders a
 *  diagonal ember/flame gradient and explains the sampling behaviour. */
function ReactiveFlintCard({
  index,
  active,
  onPick,
}: {
  index: number;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "group relative flex h-full w-full flex-col text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <div
        className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden p-5 text-white transition-transform duration-300 group-hover:scale-[1.005]"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.22 35) 0%, oklch(0.55 0.22 60) 35%, oklch(0.40 0.18 280) 100%)",
        }}
      >
        <span
          className="absolute top-3 right-4 text-[44px] font-black leading-none tabular-nums opacity-25"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="relative z-10 inline-block w-fit border border-white/30 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
          Wildcard
        </span>

        <div className="relative z-10 flex flex-col gap-2">
          <p className="font-mono text-[13px] leading-snug">
            <span className="opacity-70">sampled from </span>
            <span className="underline decoration-1 underline-offset-4">
              your background
            </span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">
            Struck fresh on every image change
          </p>
        </div>
      </div>

      <span aria-hidden className="block h-px w-full bg-foreground/15" />

      <div
        className={cn(
          "flex items-center justify-between gap-3 border-t px-4 py-3 transition-colors",
          active
            ? "border-primary bg-primary/8"
            : "border-transparent group-hover:bg-foreground/[0.03]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "block h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
              active ? "bg-primary" : "bg-foreground/30 group-hover:bg-primary",
            )}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight">
              Background reactive
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Live from your image
            </span>
          </div>
        </div>
        {active ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
            <Check size={11} strokeWidth={3} />
            Struck
          </span>
        ) : (
          <span
            aria-hidden
            className="h-3 w-12 rounded-md border border-border"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.62 0.22 35), oklch(0.55 0.22 60), oklch(0.40 0.18 280))",
            }}
          />
        )}
      </div>
    </button>
  );
}
