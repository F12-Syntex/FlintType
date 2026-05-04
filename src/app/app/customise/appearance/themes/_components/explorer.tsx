"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
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
    // Bounce back to the main appearance page so the user can
    // immediately see the change in context — and so the explorer
    // doesn't pretend to be a permanent home.
    router.push("/app/customise/appearance");
  }

  return (
    <section className="text-foreground">
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href="/app/customise/appearance"
          className="inline-flex w-fit items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to appearance
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Theme explorer
          </h1>
          <p className="text-sm text-muted-foreground">
            Each tile renders in its own colours so you can see exactly how
            the theme will look. Pick one to apply it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
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
        "group relative flex flex-col overflow-hidden rounded-md border text-left transition-shadow",
        "border-border hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {/* Preview surface — uses the theme's own colours */}
      <div
        className="flex flex-col gap-3 p-5"
        style={{
          backgroundColor: vars.background,
          color: vars.foreground,
        }}
      >
        {/* Faux topbar */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: vars["muted-foreground"] }}
          >
            FLINTTYPE
          </span>
          <span
            className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{
              backgroundColor: vars.primary,
              color: vars["primary-foreground"],
            }}
          >
            {name.split(" ")[0]}
          </span>
        </div>

        {/* Faux passage */}
        <div
          className="rounded-md border p-4"
          style={{
            backgroundColor: vars.card,
            borderColor: vars.border,
            color: vars["card-foreground"] ?? vars.foreground,
          }}
        >
          <p className="text-sm leading-relaxed">
            <span style={{ color: vars["muted-foreground"] }}>the </span>
            <span>quick </span>
            <span
              style={{
                color: vars.primary,
                textDecoration: "underline",
                textUnderlineOffset: "4px",
                textDecorationThickness: "1px",
              }}
            >
              brown
            </span>
            <span> fox jumps</span>
            <span style={{ color: vars["muted-foreground"] }}> over the lazy dog</span>
          </p>
        </div>

        {/* Stat strip */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold tabular-nums tracking-tight"
              style={{ color: vars.primary }}
            >
              82
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.16em]"
              style={{ color: vars["muted-foreground"] }}
            >
              wpm
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight">
              97
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.16em]"
              style={{ color: vars["muted-foreground"] }}
            >
              acc
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-2xl font-bold tabular-nums tracking-tight"
              style={{ color: vars["muted-foreground"] }}
            >
              30
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.16em]"
              style={{ color: vars["muted-foreground"] }}
            >
              s
            </span>
          </div>
        </div>

        {/* Swatch strip — every load-bearing surface in one row */}
        <div className="flex h-3 w-full overflow-hidden rounded-md">
          <span className="flex-1" style={{ backgroundColor: vars.background }} />
          <span className="flex-1" style={{ backgroundColor: vars.card }} />
          <span className="flex-1" style={{ backgroundColor: vars.muted }} />
          <span className="flex-1" style={{ backgroundColor: vars.accent }} />
          <span className="flex-1" style={{ backgroundColor: vars.primary }} />
          <span className="flex-1" style={{ backgroundColor: vars.foreground }} />
        </div>
      </div>

      {/* Footer in the *app* palette so names stay legible regardless
          of how aggressive the previewed theme is */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-card-foreground">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {tagline}
          </span>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
            <Check size={12} />
            Active
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Click to apply
          </span>
        )}
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
        "group relative flex flex-col overflow-hidden rounded-md border text-left transition-shadow",
        "border-border hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <div
        className="flex h-[224px] flex-col items-center justify-center gap-3 p-5 text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.62 0.22 35) 0%, oklch(0.55 0.20 200) 50%, oklch(0.50 0.22 280) 100%)",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
          Synthetic
        </span>
        <span className="text-center text-lg font-bold leading-tight">
          Sampled from your background
        </span>
        <p className="text-center text-xs opacity-90">
          The palette is generated from the average colour of your background
          image — and follows it as you change it.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 text-card-foreground">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Background reactive</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Live from your image
          </span>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
            <Check size={12} />
            Active
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Click to apply
          </span>
        )}
      </div>
    </button>
  );
}

