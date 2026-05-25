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

/** Per-option chip samples (ui-law.md §12.2a) for the Surface, Chrome,
 *  and Live-stats sections. Each is a tiny SSR-safe pure render — bare
 *  bars / dots / numerals, one short line, no chrome of its own — so the
 *  user picks the value by comparison instead of reading a label. They
 *  draw from live CSS vars (`--card`, `--primary`, `--background`) so a
 *  palette swap repaints them. Kept in one module so the visual
 *  vocabulary stays consistent and the row files stay lean. */

const FRAME = "block h-4 w-6 rounded-[3px]";
const INK = "color-mix(in oklch, var(--foreground) 22%, transparent)";
const INK_SOFT = "color-mix(in oklch, var(--foreground) 12%, transparent)";

// ─── Surface ────────────────────────────────────────────────────────

/** Dividers — a short inter-section rule in each style. */
export function DividerSample({ mode }: { mode: DividerMode }) {
  if (mode === "hidden")
    return <span aria-hidden className="block h-0 w-6 border-t border-transparent" />;
  return (
    <span
      aria-hidden
      className={cn(
        "block w-6",
        mode === "dotted"
          ? "border-t border-dashed border-foreground/45"
          : "border-t border-foreground/45",
      )}
    />
  );
}

/** Page padding — a framed box whose inner content inset grows with the
 *  preset, so "roomy" reads as more whitespace around the content. */
export function PaddingSample({ mode }: { mode: PagePaddingMode }) {
  const pad = mode === "tight" ? 1 : mode === "comfortable" ? 2.5 : 4;
  return (
    <span
      aria-hidden
      className={FRAME}
      style={{ boxShadow: `inset 0 0 0 1px ${INK}`, padding: pad }}
    >
      <span className="block h-full w-full rounded-[1px]" style={{ backgroundColor: INK_SOFT }} />
    </span>
  );
}

/** Background fill — themed paints the warm paper bg, bare leaves the
 *  page neutral (hairline only). */
export function BgFillSample({ mode }: { mode: BackgroundFillMode }) {
  return (
    <span
      aria-hidden
      className={FRAME}
      style={
        mode === "paper"
          ? { backgroundColor: "var(--background)", boxShadow: `inset 0 0 0 1px ${INK}` }
          : { backgroundColor: "transparent", boxShadow: `inset 0 0 0 1px ${INK}` }
      }
    />
  );
}

/** Monochrome accent — off keeps the coral spark, on drops it to ink. */
export function MonochromeSample({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: on ? "color-mix(in oklch, var(--foreground) 55%, transparent)" : "var(--primary)" }}
    />
  );
}

// ─── Chrome ─────────────────────────────────────────────────────────

/** Topbar style — elevated lifts off the page (shadow), flat sits on a
 *  hairline, text-only drops the bar entirely for bare marks. */
export function TopbarSample({ mode }: { mode: TopbarStyle }) {
  if (mode === "text-only")
    return (
      <span aria-hidden className="flex h-4 w-6 items-center gap-1">
        <span className="block h-1 w-1 rounded-full" style={{ backgroundColor: INK }} />
        <span className="block h-0.5 w-3" style={{ backgroundColor: INK }} />
      </span>
    );
  return (
    <span aria-hidden className="flex h-4 w-6 flex-col">
      <span
        className="block h-1.5 w-6 rounded-[2px]"
        style={{
          backgroundColor: "var(--card)",
          boxShadow:
            mode === "elevated"
              ? `inset 0 0 0 1px ${INK}, 0 1.5px 2px color-mix(in oklch, var(--foreground) 22%, transparent)`
              : `inset 0 0 0 1px ${INK}`,
        }}
      />
    </span>
  );
}

/** Footer style — full bar, thin compact bar, or nothing. */
export function FooterSample({ mode }: { mode: FooterStyle }) {
  if (mode === "hidden")
    return (
      <span aria-hidden className="flex h-4 w-6 items-end">
        <span className="block h-1.5 w-6 rounded-[2px] border border-dashed border-foreground/35" />
      </span>
    );
  return (
    <span aria-hidden className="flex h-4 w-6 items-end">
      <span
        className={cn("block w-6 rounded-[2px]", mode === "compact" ? "h-1" : "h-2")}
        style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${INK}` }}
      />
    </span>
  );
}

/** Auto-hide — the same bar at full / dimmed / nearly-faded opacity, the
 *  three states chrome takes mid-run. */
export function AutoHideSample({ mode }: { mode: AutoHideMode }) {
  const opacity = mode === "off" ? 1 : mode === "dim" ? 0.4 : 0.12;
  return (
    <span aria-hidden className="flex h-4 w-6 items-center">
      <span
        className="block h-1.5 w-6 rounded-[2px]"
        style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${INK}`, opacity }}
      />
    </span>
  );
}

/** Mode bar — three chips, three inline dashes, or nothing. */
export function ModeBarSample({ mode }: { mode: ModeBarStyle }) {
  if (mode === "hidden")
    return <span aria-hidden className="block h-2 w-6" />;
  if (mode === "inline")
    return (
      <span aria-hidden className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-0.5 w-1.5" style={{ backgroundColor: INK }} />
        ))}
      </span>
    );
  return (
    <span aria-hidden className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-2 w-2 rounded-[2px]"
          style={{ boxShadow: `inset 0 0 0 1px ${INK}` }}
        />
      ))}
    </span>
  );
}

// ─── Live stats ─────────────────────────────────────────────────────

/** Stats surface — numbers floating bare, wrapped in a card, or gone. */
export function StatSurfaceSample({ mode }: { mode: StatStripSurface }) {
  if (mode === "none")
    return <span aria-hidden className="block font-mono text-[11px] leading-none text-muted-foreground">—</span>;
  if (mode === "card")
    return (
      <span
        aria-hidden
        className="inline-block rounded-[3px] px-1 font-mono text-[11px] leading-none text-foreground"
        style={{ backgroundColor: "var(--card)", boxShadow: `inset 0 0 0 1px ${INK}` }}
      >
        42
      </span>
    );
  return <span aria-hidden className="block font-mono text-[11px] leading-none text-foreground">42</span>;
}

/** Live-stat style — off hides it, text is the plain numeral, mini is a
 *  shrunk dim numeral, flash is the intermittent (dimmer) numeral. */
export function LiveStyleSample({ style }: { style: LiveStatStyle }) {
  if (style === "off")
    return <span aria-hidden className="block font-mono text-[11px] leading-none text-muted-foreground">—</span>;
  return (
    <span
      aria-hidden
      className={cn(
        "block font-mono leading-none text-foreground",
        style === "mini" ? "text-[9px] opacity-70" : "text-[11px]",
        style === "flash" && "opacity-50",
      )}
    >
      42
    </span>
  );
}

// ─── Result ─────────────────────────────────────────────────────────

/** Always-show-decimal — the same stat with and without its tenths. */
export function DecimalSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="block font-mono text-[11px] leading-none text-foreground">
      {on ? "42.0" : "42"}
    </span>
  );
}

/** Typing-speed unit — the same pace expressed in each unit, so the
 *  user sees the scale the number lands on, not just the acronym. */
const UNIT_SAMPLE: Record<TypingSpeedUnit, string> = {
  wpm: "60",
  cpm: "300",
  wps: "1.0",
  cps: "5.0",
  wph: "3.6k",
};
export function SpeedUnitSample({ unit }: { unit: TypingSpeedUnit }) {
  return (
    <span aria-hidden className="block font-mono text-[11px] leading-none tabular-nums text-foreground">
      {UNIT_SAMPLE[unit]}
    </span>
  );
}

/** Start-graphs-at-zero — bars grounded on a zero baseline (on) vs
 *  floating from a raised baseline that exaggerates the deltas (off). */
export function GraphZeroSample({ on }: { on: boolean }) {
  const heights = on ? [5, 9, 7, 12] : [2, 9, 4, 14];
  return (
    <span aria-hidden className="flex h-4 w-6 items-end gap-0.5">
      {heights.map((h, i) => (
        <span
          key={i}
          className="block w-1 rounded-[1px]"
          style={{ height: h, backgroundColor: "color-mix(in oklch, var(--primary) 55%, transparent)" }}
        />
      ))}
    </span>
  );
}

/** Result block toggle — a populated mini panel (on) vs a ghosted empty
 *  slot (off), for the "include this result section" switches. */
export function ResultBlockSample({ on }: { on: boolean }) {
  if (!on)
    return (
      <span
        aria-hidden
        className="block h-4 w-6 rounded-[3px] border border-dashed border-foreground/25"
      />
    );
  return (
    <span
      aria-hidden
      className="flex h-4 w-6 flex-col justify-center gap-0.5 rounded-[3px] px-1"
      style={{ boxShadow: `inset 0 0 0 1px ${INK}` }}
    >
      <span className="block h-0.5 w-full rounded-full" style={{ backgroundColor: INK }} />
      <span className="block h-0.5 w-3 rounded-full" style={{ backgroundColor: INK }} />
    </span>
  );
}

// ─── Background ─────────────────────────────────────────────────────

/** Image fit — how the picture sits in the frame: filling it (cover),
 *  letterboxed inside (contain), small at natural size (auto), or
 *  repeated (tile). */
export function BgFitSample({ fit }: { fit: BgFit }) {
  const img = "color-mix(in oklch, var(--primary) 45%, transparent)";
  return (
    <span aria-hidden className={FRAME} style={{ boxShadow: `inset 0 0 0 1px ${INK}`, position: "relative", overflow: "hidden" }}>
      {fit === "cover" ? (
        <span className="absolute inset-0" style={{ backgroundColor: img }} />
      ) : fit === "contain" ? (
        <span className="absolute inset-x-0 top-1/2 block h-2 -translate-y-1/2" style={{ backgroundColor: img }} />
      ) : fit === "auto" ? (
        <span className="absolute left-0.5 top-0.5 block h-1.5 w-2" style={{ backgroundColor: img }} />
      ) : (
        <span className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px p-px">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="block" style={{ backgroundColor: img }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** Image scope — paints the whole page (page) vs only the inner content
 *  region (content). */
export function BgScopeSample({ scope }: { scope: BgScope }) {
  const img = "color-mix(in oklch, var(--primary) 40%, transparent)";
  return (
    <span aria-hidden className={FRAME} style={{ boxShadow: `inset 0 0 0 1px ${INK}`, position: "relative" }}>
      {scope === "page" ? (
        <span className="absolute inset-0 rounded-[2px]" style={{ backgroundColor: img }} />
      ) : (
        <span className="absolute inset-1 rounded-[1px]" style={{ backgroundColor: img }} />
      )}
    </span>
  );
}
