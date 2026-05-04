"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";

/** The Default palette's exact CSS-var values, mirrored from
 *  src/app/globals.css `:root` (light) and `.dark`. Hardcoded so the
 *  Default preview tile always renders correctly even when the user
 *  has another palette active — `getComputedStyle(:root)` would just
 *  return the override. */
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

export function ThemeExplorer() {
  const { themes, activeId, apply, reset } = usePalette();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";

  function handlePick(id: string | null) {
    if (id === null) reset();
    else apply(id);
    // Bounce back so the user immediately sees the palette in
    // context — explorer is a chooser, not a destination.
    router.push("/app/customise/appearance");
  }

  return (
    <section className="text-foreground">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Theme explorer
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each tile renders in its own colours so you can see exactly how
          the theme reads in the app. Tap one to apply it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <ThemeCard
          name="Default"
          tagline="Coral on paper — flinttype's own palette"
          vars={DEFAULT_VARS[mode]}
          active={activeId === null}
          onPick={() => handlePick(null)}
        />
        {themes.map((t) => {
          if (t.id === BACKGROUND_REACTIVE_ID) {
            return (
              <ReactiveCard
                key={t.id}
                active={activeId === t.id}
                onPick={() => handlePick(t.id)}
              />
            );
          }
          const vars = pickVars(t, mode);
          if (!vars) return null;
          return (
            <ThemeCard
              key={t.id}
              name={t.name}
              tagline={t.source ? "tweakcn" : "Custom"}
              vars={vars}
              active={activeId === t.id}
              onPick={() => handlePick(t.id)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ThemeCard({
  name,
  tagline,
  vars,
  active,
  onPick,
}: {
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
        "group relative block overflow-hidden rounded-md border border-border text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        active && "border-primary ring-2 ring-primary/40",
      )}
    >
      {/* Hero — pure theme paint, no app chrome */}
      <div
        className="relative flex aspect-[4/3] flex-col justify-between p-5"
        style={{
          backgroundColor: vars.background,
          color: vars.foreground,
        }}
      >
        {/* Active badge top-right */}
        {active ? (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
            }}
          >
            <Check size={11} strokeWidth={3} />
            Active
          </span>
        ) : null}

        {/* Sample passage — dim the bulk, leave the next-word in the
            theme's foreground, and tag a single word in primary so the
            accent reads at a glance. Mirrors how the real app paints. */}
        <div className="flex-1 pt-1">
          <p
            className="font-mono text-[13px] leading-relaxed"
            style={{ color: vars["muted-foreground"] }}
          >
            <span style={{ color: vars.foreground }}>the quick </span>
            <span
              style={{
                color: vars.primary,
                textDecoration: "underline",
                textDecorationThickness: "1px",
                textUnderlineOffset: "4px",
              }}
            >
              brown
            </span>
            <span style={{ color: vars.foreground }}> fox</span>
            <span> jumps over the lazy dog and keeps on going</span>
          </p>
        </div>

        {/* Caret + sample WPM — gives the eye a brand-typical anchor */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold tabular-nums tracking-tight"
              style={{ color: vars.primary }}
            >
              82
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: vars["muted-foreground"] }}
            >
              wpm
            </span>
          </div>
          <span
            aria-hidden
            className="block h-6 w-[3px] rounded-sm"
            style={{ backgroundColor: vars.primary }}
          />
        </div>
      </div>

      {/* Identity strip — kept in the *app* palette so names stay
          readable across every theme variation. Swatch row sits inside
          this strip rather than over the hero, so it doesn't compete
          with the preview. */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-card-foreground">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {tagline}
          </span>
        </div>
        <div className="flex h-4 shrink-0 overflow-hidden rounded-md border border-border">
          {[
            vars.background,
            vars.card,
            vars.muted,
            vars.accent,
            vars.primary,
            vars.foreground,
          ].map((c, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="block h-full w-3"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

function ReactiveCard({ active, onPick }: { active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "group relative block overflow-hidden rounded-md border border-border text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        active && "border-primary ring-2 ring-primary/40",
      )}
    >
      <div
        className="relative flex aspect-[4/3] flex-col justify-between p-5 text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.22 35) 0%, oklch(0.55 0.20 200) 50%, oklch(0.50 0.22 280) 100%)",
        }}
      >
        {active ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
            <Check size={11} strokeWidth={3} />
            Active
          </span>
        ) : null}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
          Synthetic
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold leading-tight">
            Sampled from your background
          </h2>
          <p className="text-xs leading-relaxed opacity-90">
            The palette is generated from the average colour of your
            background image — and follows it as you change it.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-card-foreground">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            Background reactive
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Live from your image
          </span>
        </div>
      </div>
    </button>
  );
}
