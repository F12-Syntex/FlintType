"use client";

import { useBackgroundPrefs } from "@/lib/background-prefs";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { cn } from "@/lib/utils";

/** Bespoke per-section previews. The contract (ui-law §12.5): each
 *  preview foregrounds *its own* setting — no shared MiniSample
 *  repeating across nine sections. Static + live: built from real CSS
 *  variables so the override is visible immediately, no animation. */

const SAMPLE = "the quick brown fox";
const SAMPLE_TYPED = 8;
const SAMPLE_ERROR = 4;

/* ─── Themes & mode ────────────────────────────────────────────── */

export function ThemePreview() {
  return (
    <div className="grid grid-cols-3 divide-x divide-border">
      <SwatchTile var="--background" name="Background" textVar="--foreground" />
      <SwatchTile var="--card" name="Card" textVar="--foreground" />
      <SwatchTile var="--primary" name="Accent" textVar="--primary-foreground" />
    </div>
  );
}

function SwatchTile({
  var: cssVar,
  name,
  textVar,
}: {
  var: string;
  name: string;
  textVar: string;
}) {
  return (
    <div
      style={{ background: `var(${cssVar})`, color: `var(${textVar})` }}
      className="flex flex-col justify-between gap-6 px-4 py-5 sm:px-5 sm:py-7"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
        {name}
      </span>
      <span className="font-mono text-[11px] tabular-nums opacity-60">
        {cssVar}
      </span>
    </div>
  );
}

/* ─── Colors ───────────────────────────────────────────────────── */

const COLOR_TOKENS: ReadonlyArray<{ name: string; var: string }> = [
  { name: "Primary", var: "--primary" },
  { name: "Accent", var: "--accent" },
  { name: "Background", var: "--background" },
  { name: "Card", var: "--card" },
  { name: "Border", var: "--border" },
  { name: "Muted", var: "--muted-foreground" },
];

export function ColorPreview() {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {COLOR_TOKENS.map((t) => (
          <div
            key={t.var}
            className="flex flex-col gap-2 border-r border-b border-border px-3 py-3 last:border-r-0 sm:border-b-0"
          >
            <span
              aria-hidden
              style={{ background: `var(${t.var})` }}
              className="h-7 w-full rounded-sm border border-foreground/10"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t.name}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-4 font-mono text-[15px] leading-relaxed">
        {[...SAMPLE].map((ch, i) => {
          let color = "var(--ft-passage-untyped, var(--muted-foreground))";
          if (i < SAMPLE_TYPED) {
            color =
              i === SAMPLE_ERROR
                ? "var(--ft-passage-error, var(--destructive))"
                : "var(--ft-passage-typed, var(--primary))";
          }
          return (
            <span
              key={i}
              style={{
                color,
                textDecoration: i === SAMPLE_ERROR ? "underline" : undefined,
                textDecorationColor:
                  i === SAMPLE_ERROR
                    ? "var(--ft-passage-error, var(--destructive))"
                    : undefined,
                textUnderlineOffset: i === SAMPLE_ERROR ? "4px" : undefined,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Geometry ─────────────────────────────────────────────────── */

export function GeometryPreview() {
  return (
    <div className="flex items-center justify-center gap-5 px-5 py-7 sm:gap-7 sm:py-9">
      <div className="size-16 rounded-md border border-border bg-card sm:size-20" />
      <div className="flex h-9 items-center rounded-md bg-primary px-4 text-xs font-medium uppercase tracking-[0.14em] text-primary-foreground">
        Action
      </div>
      <div className="flex h-7 items-center rounded-md border border-border bg-muted px-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Chip
      </div>
    </div>
  );
}

/* ─── Caret & cursor ───────────────────────────────────────────── */

export function CaretPreview() {
  const { settings } = useCaretSettings();
  // Use a single short word so the caret is unmistakably the focal
  // point — not buried inside a long passage.
  const word = "type";
  const caretAt = word.length;

  return (
    <div className="flex items-center justify-center px-5 py-9 sm:py-11">
      <div className="relative flex items-baseline font-mono text-[42px] font-semibold tracking-[-0.02em] sm:text-[56px]">
        <span className="text-foreground">{word}</span>
        <CaretGlyph
          settings={settings}
          // Approximate the caret target relative to a single character
          // — width/height scale off the displayed font size.
          targetH={settings.style === "line" ? 56 : 56}
          targetW={28}
          offsetLeft={caretAt * 28}
        />
        <span className="ml-1 text-muted-foreground/40 select-none">.</span>
      </div>
    </div>
  );
}

function CaretGlyph({
  settings,
  targetH,
  targetW,
  offsetLeft,
}: {
  settings: { style: string; width: number; radius: number };
  targetH: number;
  targetW: number;
  offsetLeft: number;
}) {
  if (settings.style === "off") return null;
  const base: React.CSSProperties = {
    position: "absolute",
    backgroundColor: "var(--primary)",
    borderRadius: settings.radius,
  };
  if (settings.style === "line") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: offsetLeft,
          bottom: 4,
          width: settings.width,
          height: targetH * 0.85,
        }}
      />
    );
  }
  if (settings.style === "block") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: offsetLeft,
          bottom: 4,
          width: targetW,
          height: targetH * 0.85,
          backgroundColor:
            "color-mix(in oklch, var(--primary) 35%, transparent)",
        }}
      />
    );
  }
  if (settings.style === "underline") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: offsetLeft,
          bottom: 4,
          width: targetW,
          height: settings.width,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...base,
        left: offsetLeft,
        bottom: 4,
        width: targetW,
        height: targetH * 0.85,
        backgroundColor: "transparent",
        border: `${settings.width}px solid var(--primary)`,
      }}
    />
  );
}

/* ─── Typography ───────────────────────────────────────────────── */

export function TypographyPreview() {
  return (
    <div
      className="flex flex-col gap-3 px-5 py-7 sm:py-9"
      style={{
        fontFamily: "var(--ft-font-family, inherit)",
      }}
    >
      <span
        className="font-mono font-bold tracking-[-0.04em] text-foreground"
        style={{
          fontSize: "calc(var(--ft-font-scale, 1) * 3.5rem)",
          lineHeight: 0.95,
        }}
      >
        Type.
      </span>
      <span
        className="font-mono leading-relaxed text-muted-foreground"
        style={{
          fontSize: "calc(var(--ft-font-scale, 1) * 1rem)",
          wordSpacing: "var(--ft-word-spacing, 0.25em)",
        }}
      >
        the quick brown fox jumps over the lazy dog
      </span>
    </div>
  );
}

/* ─── Background ───────────────────────────────────────────────── */

export function BackgroundPreview() {
  const { prefs } = useBackgroundPrefs();
  const hasImage = prefs.imageUrl.length > 0;

  return (
    <div className="px-5 py-6 sm:px-7 sm:py-8">
      <div
        className="relative mx-auto h-32 w-full max-w-md overflow-hidden rounded-md border border-foreground/15 sm:h-36"
        style={
          hasImage
            ? {
                backgroundImage: `url("${prefs.imageUrl}")`,
                backgroundSize:
                  prefs.fit === "tile"
                    ? "auto"
                    : prefs.fit === "auto"
                      ? "auto"
                      : prefs.fit,
                backgroundRepeat:
                  prefs.fit === "tile" ? "repeat" : "no-repeat",
                backgroundPosition: "center",
              }
            : { background: "var(--background)" }
        }
      >
        <div className="absolute inset-x-4 inset-y-4 flex flex-col justify-center gap-1.5 rounded-md bg-card/85 px-4 py-3 backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice surface
          </span>
          <span className="font-mono text-sm text-foreground">
            the quick brown fox
          </span>
        </div>
      </div>
      {!hasImage ? (
        <p className="mt-3 text-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          No image — solid background
        </p>
      ) : null}
    </div>
  );
}

/* ─── Live stats ───────────────────────────────────────────────── */

export function LiveStatsPreview() {
  const { prefs } = useAppearancePrefs();
  const color = prefs.liveStatsColor || "var(--primary)";
  const opacity = prefs.liveStatsOpacity ?? 1;

  return (
    <div className="flex items-center justify-center px-5 py-9 sm:py-12">
      <div
        className="flex items-baseline gap-7 font-mono text-2xl uppercase tracking-[0.08em] sm:text-3xl"
        style={{ color, opacity }}
      >
        <span className="tabular-nums">30s</span>
        <span className="tabular-nums">60 wpm</span>
        <span className="tabular-nums">96 acc</span>
      </div>
    </div>
  );
}

/* ─── Typing area ──────────────────────────────────────────────── */

export function TypingAreaPreview() {
  const { prefs } = useAppearancePrefs();
  // Visualise the maxLineWidth as a horizontal band: the active band
  // is brighter, the margins are hatched. 80ch ≈ standard column.
  const widthCh = prefs.maxLineWidth || 80;
  const widthPct = Math.min(95, (widthCh / 100) * 100);

  return (
    <div className="px-5 py-7 sm:px-7">
      <div className="relative">
        <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-foreground/15 bg-muted/30 sm:h-28">
          <div
            className="flex h-full items-center justify-center rounded-md border border-foreground/15 bg-card px-4"
            style={{ width: `${widthPct}%` }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-foreground tabular-nums">
                {widthCh > 0 ? widthCh : "auto"}
              </span>{" "}
              ch · {prefs.linesRendered || "auto"} lines
            </span>
          </div>
        </div>
        <div className="mt-3 flex justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span>margin</span>
          <span>{prefs.tapeMode === "off" ? "free flow" : "tape"}</span>
          <span>margin</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable mini stats strip used on Result preview ─────────── */

export function MiniStatsStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-6 font-mono">{children}</div>
  );
}

/** Helper: small value/label stat. */
export function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-3xl font-bold tabular-nums tracking-[-0.03em]",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
