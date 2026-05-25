import {
  type AutoHideMode,
  type BackgroundFillMode,
  type DividerMode,
  type FooterStyle,
  type LiveStatStyle,
  type ModeBarStyle,
  type PagePaddingMode,
  type StatStripSurface,
  type TopbarStyle,
  type TypingSpeedUnit,
} from "@/lib/appearance-prefs";
import { type BgFit, type BgScope } from "@/lib/background-prefs";
import { cn } from "@/lib/utils";

/** Per-option chip samples (ui-law.md §12.2a). Each is a small but
 *  *literal* mini-mockup of what the option produces — a real card with
 *  text, a mini app frame with chrome, a stat in a panel — so the user
 *  reads the exact result, not an abstract swatch. Pure + SSR-safe; they
 *  draw from live CSS vars (`--card`, `--background`, `--primary`) so a
 *  palette swap repaints them. One module keeps the vocabulary uniform
 *  and the row files lean. */

const BORDER = "color-mix(in oklch, var(--foreground) 16%, transparent)";
const INK = "color-mix(in oklch, var(--foreground) 30%, transparent)";
const INK_SOFT = "color-mix(in oklch, var(--foreground) 13%, transparent)";
const CORAL = "color-mix(in oklch, var(--primary) 75%, transparent)";

/** The shared mockup canvas — a fixed tile the scene is composed inside,
 *  so every option in a row lines up to the same footprint. */
function Tile({
  children,
  bg = "var(--background)",
  border = true,
  className,
}: {
  children?: React.ReactNode;
  bg?: string;
  border?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative block h-9 w-16 overflow-hidden rounded-[3px]", className)}
      style={{
        backgroundColor: bg,
        boxShadow: border ? `inset 0 0 0 1px ${BORDER}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** A text line. `c` overrides the colour (e.g. a typed/coral line). */
function Bar({ w, c = INK }: { w: string; c?: string }) {
  return <span className="block h-[3px] rounded-full" style={{ width: w, backgroundColor: c }} />;
}

// ─── Surface ────────────────────────────────────────────────────────

/** Card surfaces — the same content card painted solid, as a faint
 *  wash, or fully transparent so the page shows through. */
export function CardSurfaceSample({ mode }: { mode: "solid" | "subtle" | "transparent" }) {
  const card =
    mode === "solid"
      ? { backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${BORDER}` }
      : mode === "subtle"
        ? {
            backgroundColor: "color-mix(in oklch, var(--background) 55%, var(--card))",
            boxShadow: `inset 0 0 0 1px ${INK_SOFT}`,
          }
        : { backgroundColor: "transparent" };
  return (
    <Tile>
      <span className="absolute inset-1.5 flex flex-col justify-center gap-1 rounded-[2px] px-1.5" style={card}>
        <Bar w="100%" />
        <Bar w="55%" />
      </span>
    </Tile>
  );
}

/** Dividers — two stacked content blocks with the section rule between
 *  them rendered in the chosen style. */
export function DividerSample({ mode }: { mode: DividerMode }) {
  const rule =
    mode === "hidden"
      ? "1px solid transparent"
      : mode === "dotted"
        ? `1px dashed ${INK}`
        : `1px solid ${INK}`;
  return (
    <Tile>
      <span className="absolute inset-0 flex flex-col justify-center gap-1.5 px-2">
        <span className="flex flex-col gap-1">
          <Bar w="90%" />
          <Bar w="60%" />
        </span>
        <span className="block w-full" style={{ borderTop: rule }} />
        <span className="flex flex-col gap-1">
          <Bar w="80%" />
          <Bar w="50%" />
        </span>
      </span>
    </Tile>
  );
}

/** Page padding — a card whose content insets grow with the preset, so
 *  the whitespace difference is literal. */
export function PaddingSample({ mode }: { mode: PagePaddingMode }) {
  const pad = mode === "tight" ? 2 : mode === "comfortable" ? 5 : 9;
  return (
    <Tile bg="var(--card)">
      <span className="absolute inset-0 flex flex-col justify-center gap-1" style={{ padding: pad }}>
        <Bar w="100%" />
        <Bar w="70%" />
      </span>
    </Tile>
  );
}

/** Background fill — themed paints the warm paper field behind the
 *  content card; bare drops it to a flat neutral. */
export function BgFillSample({ mode }: { mode: BackgroundFillMode }) {
  return (
    <Tile bg={mode === "paper" ? "var(--background)" : "color-mix(in oklch, var(--foreground) 6%, white)"}>
      <span
        className="absolute inset-1.5 flex flex-col justify-center gap-1 rounded-[2px] px-1.5"
        style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${BORDER}` }}
      >
        <Bar w="100%" />
        <Bar w="55%" />
      </span>
    </Tile>
  );
}

/** Monochrome accent — off keeps the coral spark on the CTA, on drops it
 *  to ink. Shown as a mini button. */
export function MonochromeSample({ on }: { on: boolean }) {
  return (
    <Tile>
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className="block h-3 w-8 rounded-[2px]"
          style={{ backgroundColor: on ? "color-mix(in oklch, var(--foreground) 60%, transparent)" : CORAL }}
        />
      </span>
    </Tile>
  );
}

// ─── Chrome ─────────────────────────────────────────────────────────

/** A mini logo dot + two nav dashes — the topbar's contents. */
function TopbarContents() {
  return (
    <span className="flex items-center gap-1 px-1.5">
      <span className="block h-1.5 w-1.5 rounded-[1px]" style={{ backgroundColor: CORAL }} />
      <span className="block h-0.5 w-2 rounded-full" style={{ backgroundColor: INK }} />
      <span className="block h-0.5 w-2 rounded-full" style={{ backgroundColor: INK }} />
    </span>
  );
}

/** Topbar style — a mini app with the bar elevated (shadow), flat
 *  (hairline only), or text-only (no bar surface). */
export function TopbarSample({ mode }: { mode: TopbarStyle }) {
  const bar =
    mode === "elevated"
      ? {
          backgroundColor: "var(--card)",
          boxShadow: `0 1px 2px color-mix(in oklch, var(--foreground) 22%, transparent), inset 0 0 0 1px ${BORDER}`,
        }
      : mode === "flat"
        ? { backgroundColor: "var(--card)", borderBottom: `1px solid ${BORDER}` }
        : { backgroundColor: "transparent" };
  return (
    <Tile>
      <span className="absolute inset-x-0 top-0 flex h-3 items-center" style={bar}>
        <TopbarContents />
      </span>
      <span className="absolute inset-x-0 bottom-0 flex h-6 flex-col justify-center gap-1 px-2">
        <Bar w="90%" />
        <Bar w="60%" />
      </span>
    </Tile>
  );
}

/** Footer style — content with a full footer bar, a thin compact bar, or
 *  none. */
export function FooterSample({ mode }: { mode: FooterStyle }) {
  return (
    <Tile>
      <span className="absolute inset-x-0 top-0 flex h-6 flex-col justify-center gap-1 px-2">
        <Bar w="90%" />
        <Bar w="60%" />
      </span>
      {mode !== "hidden" ? (
        <span
          className="absolute inset-x-0 bottom-0 flex items-center px-1.5"
          style={{
            height: mode === "compact" ? 4 : 9,
            backgroundColor: "var(--card)",
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          {mode === "visible" ? <span className="block h-0.5 w-3 rounded-full" style={{ backgroundColor: INK }} /> : null}
        </span>
      ) : null}
    </Tile>
  );
}

/** Auto-hide — the topbar at full / dimmed / nearly-faded opacity over a
 *  typing line, the three states chrome takes mid-run. */
export function AutoHideSample({ mode }: { mode: AutoHideMode }) {
  const opacity = mode === "off" ? 1 : mode === "dim" ? 0.4 : 0.12;
  return (
    <Tile>
      <span
        className="absolute inset-x-0 top-0 flex h-3 items-center"
        style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${BORDER}`, opacity }}
      >
        <TopbarContents />
      </span>
      <span className="absolute inset-x-0 bottom-1 flex items-center gap-0.5 px-2">
        <Bar w="60%" c={CORAL} />
        <span className="block h-2 w-0.5" style={{ backgroundColor: CORAL }} />
      </span>
    </Tile>
  );
}

/** Mode bar — the words/time/quote switch shown as chips, as inline
 *  text, or hidden. */
export function ModeBarSample({ mode }: { mode: ModeBarStyle }) {
  return (
    <Tile>
      <span className="absolute inset-x-0 top-1.5 flex items-center justify-center gap-1">
        {mode === "chips"
          ? [0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-2 w-3 rounded-[2px]"
                style={{ boxShadow: `inset 0 0 0 1px ${BORDER}`, backgroundColor: i === 0 ? CORAL : "var(--card)" }}
              />
            ))
          : mode === "inline"
            ? [0, 1, 2].map((i) => (
                <span key={i} className="block h-0.5 w-3 rounded-full" style={{ backgroundColor: i === 0 ? CORAL : INK }} />
              ))
            : null}
      </span>
      <span className="absolute inset-x-0 bottom-1.5 flex flex-col gap-1 px-2">
        <Bar w="85%" />
        <Bar w="55%" />
      </span>
    </Tile>
  );
}

// ─── Live stats ─────────────────────────────────────────────────────

/** Stats surface — the WPM/ACC ticker floating bare, wrapped in a card,
 *  or removed. */
export function StatSurfaceSample({ mode }: { mode: StatStripSurface }) {
  if (mode === "none")
    return (
      <Tile>
        <span className="absolute inset-0 flex flex-col justify-center gap-1 px-2">
          <Bar w="90%" />
          <Bar w="60%" />
        </span>
      </Tile>
    );
  const stat = (
    <span className="flex items-center gap-1 font-mono text-[9px] leading-none text-foreground">
      <span className="font-semibold" style={{ color: "var(--primary)" }}>
        42
      </span>
      <span className="text-muted-foreground">98%</span>
    </span>
  );
  return (
    <Tile>
      <span className="absolute inset-x-0 top-1.5 flex justify-center">
        {mode === "card" ? (
          <span
            className="rounded-[2px] px-1 py-0.5"
            style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${BORDER}` }}
          >
            {stat}
          </span>
        ) : (
          stat
        )}
      </span>
      <span className="absolute inset-x-0 bottom-1.5 flex flex-col gap-1 px-2">
        <Bar w="80%" />
      </span>
    </Tile>
  );
}

/** Live-stat style — off hides it, text is full size, mini is shrunk +
 *  dim, flash is the intermittent (faded) readout. */
export function LiveStyleSample({ style }: { style: LiveStatStyle }) {
  return (
    <Tile>
      <span className="absolute inset-0 flex items-center justify-center">
        {style === "off" ? (
          <span className="font-mono text-[11px] leading-none text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "font-mono font-semibold leading-none",
              style === "mini" ? "text-[10px] opacity-70" : "text-sm",
              style === "flash" && "opacity-45",
            )}
            style={{ color: "var(--primary)" }}
          >
            42
          </span>
        )}
      </span>
    </Tile>
  );
}

// ─── Result ─────────────────────────────────────────────────────────

/** Always-show-decimal — the headline stat with vs without its tenths. */
export function DecimalSample({ on }: { on: boolean }) {
  return (
    <Tile bg="var(--card)">
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold leading-none" style={{ color: "var(--primary)" }}>
        {on ? "42.0" : "42"}
      </span>
    </Tile>
  );
}

/** Typing-speed unit — the same pace expressed in each unit, so the user
 *  sees the magnitude the number lands on, not just the acronym. */
const UNIT_SAMPLE: Record<TypingSpeedUnit, string> = {
  wpm: "60",
  cpm: "300",
  wps: "1.0",
  cps: "5.0",
  wph: "3.6k",
};
export function SpeedUnitSample({ unit }: { unit: TypingSpeedUnit }) {
  return (
    <span aria-hidden className="flex items-baseline gap-0.5 font-mono leading-none">
      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--primary)" }}>
        {UNIT_SAMPLE[unit]}
      </span>
      <span className="text-[8px] uppercase text-muted-foreground">{unit}</span>
    </span>
  );
}

/** Start-graphs-at-zero — a line that climbs from a zero baseline (on)
 *  vs one cropped to a raised baseline that exaggerates the deltas
 *  (off). */
export function GraphZeroSample({ on }: { on: boolean }) {
  // Two polylines over the same data; the "off" one is scaled to a
  // cropped axis so the same wiggle looks far steeper.
  const pts = on ? "0,30 16,22 32,25 48,12 64,16" : "0,34 16,20 32,26 48,2 64,9";
  return (
    <Tile bg="var(--card)">
      <span className="absolute inset-0">
        <svg viewBox="0 0 64 36" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1="34" x2="64" y2="34" stroke={INK_SOFT} strokeWidth="1" />
          <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="2" />
        </svg>
      </span>
    </Tile>
  );
}

/** Result block toggle — a populated stat panel (on) vs a ghosted empty
 *  slot (off), for the "include this result section" switches. */
export function ResultBlockSample({ on }: { on: boolean }) {
  if (!on)
    return <Tile border={false} className="border border-dashed" />;
  return (
    <Tile bg="var(--card)">
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono text-[11px] font-bold leading-none" style={{ color: "var(--primary)" }}>
          128
        </span>
        <span className="block h-0.5 w-6 rounded-full" style={{ backgroundColor: INK }} />
      </span>
    </Tile>
  );
}

// ─── Background ─────────────────────────────────────────────────────

/** Image fit — how the picture sits in the frame: filling it (cover),
 *  letterboxed (contain), small at natural size (auto), or tiled. */
export function BgFitSample({ fit }: { fit: BgFit }) {
  const img = "color-mix(in oklch, var(--primary) 50%, transparent)";
  return (
    <Tile bg="var(--card)">
      {fit === "cover" ? (
        <span className="absolute inset-0" style={{ backgroundColor: img }} />
      ) : fit === "contain" ? (
        <span className="absolute inset-x-0 top-1/2 block h-4 -translate-y-1/2" style={{ backgroundColor: img }} />
      ) : fit === "auto" ? (
        <span className="absolute left-1 top-1 block h-3 w-4" style={{ backgroundColor: img }} />
      ) : (
        <span className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-px p-px">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="block" style={{ backgroundColor: img }} />
          ))}
        </span>
      )}
    </Tile>
  );
}

/** Image scope — paints the whole page (page) vs only the inner content
 *  region (content). */
export function BgScopeSample({ scope }: { scope: BgScope }) {
  const img = "color-mix(in oklch, var(--primary) 45%, transparent)";
  return (
    <Tile bg={scope === "page" ? img : "var(--background)"}>
      {scope === "content" ? (
        <span className="absolute inset-1.5 rounded-[2px]" style={{ backgroundColor: img }} />
      ) : null}
    </Tile>
  );
}
