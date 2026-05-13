"use client";

import { Crown, Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { recordIfPb } from "@/lib/pb-cache";
import { formatSpeed, SPEED_UNIT_LABEL } from "@/lib/speed-unit";
import { cn } from "@/lib/utils";
import { type KeyEvent, usePractice } from "./practice-state";
import { type Bucket, ResultChart } from "./result-chart";
import {
  ExtraStats,
  HandBalance,
  PerLetterSlowness,
} from "./result-insights";

// ─── Stats ─────────────────────────────────────────────────────────

function peakWpm(buckets: readonly Bucket[]): number {
  return buckets.reduce((m, b) => (b.wpm > m ? b.wpm : m), 0);
}

function avgWpm(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 0;
  return buckets.reduce((s, b) => s + b.wpm, 0) / buckets.length;
}

function stallWpm(buckets: readonly Bucket[]): number {
  if (buckets.length === 0) return 0;
  return buckets.reduce((m, b) => (b.wpm < m ? b.wpm : m), buckets[0]!.wpm);
}

function consistencyScore(buckets: readonly Bucket[]): number {
  if (buckets.length < 2) return 100;
  const avg = avgWpm(buckets);
  if (avg === 0) return 0;
  const variance =
    buckets.reduce((s, b) => s + (b.wpm - avg) ** 2, 0) / buckets.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
}

// ─── Pieces ────────────────────────────────────────────────────────

function BigStat({
  label,
  value,
  suffix,
  accent = false,
  pb = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: boolean;
  /** When true, paint the PB crown + confetti burst over the stat. */
  pb?: boolean;
}) {
  return (
    <div className="relative flex flex-col gap-1 leading-none">
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "relative inline-flex items-baseline gap-2 text-2xl font-semibold tabular-nums sm:text-3xl lg:text-4xl",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        {suffix ? (
          <span className="text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        {pb ? <PbCrown /> : null}
        {pb ? <PbConfetti /> : null}
      </span>
    </div>
  );
}

/** Crown badge that sits to the right of the stat value on a new PB.
 *  Inline-positioned so it shares the value's baseline — no absolute
 *  positioning to collide with the digits. Pops in on mount under
 *  motion-safe; reduced-motion users see the rest pose. */
function PbCrown() {
  return (
    <span
      aria-label="new personal best"
      className={cn(
        "ml-1 inline-flex items-center self-center text-primary",
        "motion-safe:animate-[pb-crown-pop_700ms_cubic-bezier(0.16,1,0.3,1)_both]",
      )}
    >
      <Crown
        strokeWidth={2.25}
        className="size-7 sm:size-8 lg:size-9"
        aria-hidden
      />
    </span>
  );
}

/** Confetti burst that fires once when the user lands a new PB.
 *  Pure CSS — 24 thin rectangles fan out from the stat origin at
 *  pre-baked angles, drop under "gravity" via a `dy` offset, and
 *  fade out as they rotate. Each piece's end position is encoded as
 *  CSS variables (--burst-dx / --burst-dy) so the shared
 *  `pb-confetti` keyframe (in globals.css) interpolates from origin
 *  to a final point without trig functions. Hidden under
 *  prefers-reduced-motion via the `motion-safe:` prefix on the
 *  animation class. */
function PbConfetti() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 size-0"
    >
      {CONFETTI_PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 block opacity-0 motion-safe:animate-[pb-confetti_1200ms_cubic-bezier(0.22,0.61,0.36,1)_forwards]"
          style={
            {
              ["--burst-dx"]: `${p.dx}px`,
              ["--burst-dy"]: `${p.dy}px`,
              ["--burst-rotate"]: `${p.rotate}deg`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Confetti is deterministic — pre-baked once at module load so each
 *  burst is identical (no SSR/client jitter, no per-render reshuffle).
 *  Two layers: a wide initial spray angled mostly upward, a slower
 *  trickle of larger pieces. Colours pull from the brand-accent set
 *  via `var(--primary)`, the accent foreground, and a couple of
 *  warm-paper highlights so the burst doesn't read as a single-hue
 *  glow. */
type ConfettiPiece = {
  dx: number;
  dy: number;
  rotate: number;
  w: number;
  h: number;
  color: string;
  delay: number;
};
const CONFETTI_PIECES: readonly ConfettiPiece[] = (() => {
  const COUNT = 24;
  const COLORS = [
    "var(--primary)",
    "var(--primary)",
    "color-mix(in oklch, var(--primary) 60%, var(--foreground))",
    "color-mix(in oklch, var(--primary) 55%, white)",
    "var(--accent-foreground)",
  ];
  const out: ConfettiPiece[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    // Upper hemisphere only (angle 200°-340°) so confetti shoots up
    // and outward like a real party popper, then arcs back down via
    // the +dy gravity addition. Mirror the index to keep distribution
    // even on both sides of the stat.
    const t = i / COUNT;
    const angleDeg = 200 + t * 140 + (i % 2 === 0 ? -8 : 8);
    const angleRad = (angleDeg * Math.PI) / 180;
    const distance = 70 + ((i * 13) % 40);
    const gravity = 60 + ((i * 7) % 40);
    out.push({
      dx: Math.round(Math.cos(angleRad) * distance),
      dy: Math.round(Math.sin(angleRad) * distance + gravity),
      rotate: 360 + ((i * 47) % 360),
      w: 4 + ((i * 3) % 4),
      h: 8 + ((i * 5) % 6),
      color: COLORS[i % COLORS.length]!,
      delay: (i * 14) % 120,
    });
  }
  return out;
})();

/** Render the run's source passage with each character coloured by its
 *  *speed* — fast = foreground (white/black per theme), slow = primary
 *  full. The 10th–90th-percentile range becomes the colour scale so a
 *  single outlier (a yawn) doesn't crush the gradient. */
function PassageHeatmap({
  words,
  events,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
}) {
  const latencyByPos = useMemo(() => {
    const map = new Map<string, number>();
    let w = 0;
    let c = 0;
    let prevT = 0;
    for (const e of events) {
      if (!e.correct) continue;
      const word = words[w];
      if (!word) break;
      map.set(`${w}:${c}`, Math.max(0, e.t - prevT));
      prevT = e.t;
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    }
    return map;
  }, [events, words]);

  const [lo, hi] = useMemo(() => {
    const sorted = [...latencyByPos.values()].sort((a, b) => a - b);
    if (sorted.length < 4) return [0, 1] as const;
    const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 1;
    return [p10, Math.max(p90, p10 + 1)] as const;
  }, [latencyByPos]);

  if (words.length === 0) return null;

  return (
    <div className="font-mono text-base leading-[1.7] tracking-[0.04em] [word-spacing:0.25em]">
      {words.map((word, wi) => (
        <span key={wi}>
          {[...word].map((ch, ci) => {
            const lat = latencyByPos.get(`${wi}:${ci}`);
            if (lat == null) {
              return (
                <span key={ci} className="text-muted-foreground/60">
                  {ch}
                </span>
              );
            }
            const span = hi - lo;
            const intensity =
              span > 0 ? Math.max(0, Math.min(1, (lat - lo) / span)) : 0;
            const pct = Math.round(intensity * 100);
            return (
              <span
                key={ci}
                style={{
                  color: `color-mix(in oklch, var(--primary) ${pct}%, var(--foreground))`,
                }}
                title={`${Math.round(lat)} ms`}
              >
                {ch}
              </span>
            );
          })}
          {wi < words.length - 1 ? (
            <span className="text-muted-foreground/60">{" "}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}


// ─── Replay ────────────────────────────────────────────────────────

function reconstructCursor(
  events: readonly KeyEvent[],
  words: readonly string[],
  upTo: number,
) {
  let w = 0;
  let c = 0;
  const errorWords = new Set<number>();
  for (let i = 0; i < upTo; i += 1) {
    const e = events[i]!;
    const word = words[w];
    if (!word) break;
    if (e.correct) {
      c += 1;
      if (c >= word.length) {
        w += 1;
        c = 0;
      }
    } else {
      errorWords.add(w);
    }
  }
  return { wordIdx: w, charIdx: c, errorWords };
}

function ReplayView({
  words,
  events,
  onExit,
}: {
  words: readonly string[];
  events: readonly KeyEvent[];
  onExit: () => void;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (paused) return;
    if (step >= events.length) {
      const id = setTimeout(onExit, 1500);
      return () => clearTimeout(id);
    }
    const cur = events[step]!;
    const next = events[step + 1];
    const realDelay = next ? Math.max(20, next.t - cur.t) : 600;
    const id = setTimeout(
      () => setStep((s) => s + 1),
      realDelay / speed,
    );
    return () => clearTimeout(id);
  }, [step, events, paused, speed, onExit]);

  const { wordIdx, charIdx, errorWords } = useMemo(
    () => reconstructCursor(events, words, step),
    [events, words, step],
  );

  const pct =
    events.length > 0 ? Math.min(100, Math.round((step / events.length) * 100)) : 0;
  const elapsed = step > 0 && events[step - 1] ? events[step - 1]!.t : 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-4 py-6">
      <div className="flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>
            replay · {pct}% · {(elapsed / 1000).toFixed(1)}s
          </span>
          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-sm border px-2 py-0.5 font-mono normal-case",
                  speed === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {s}×
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? "play" : "pause"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit}>
              stop
            </Button>
          </div>
        </div>

        <div
          aria-hidden
          className="h-0.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="font-mono text-xl leading-[1.7] tracking-[0.04em]">
          {words.map((word, wi) => (
            <span key={wi}>
              {[...word].map((ch, ci) => {
                const typed =
                  wi < wordIdx || (wi === wordIdx && ci < charIdx);
                const cls = !typed
                  ? "text-muted-foreground"
                  : errorWords.has(wi)
                    ? "text-primary underline decoration-1 underline-offset-[6px]"
                    : "text-foreground";
                const isCursor = wi === wordIdx && ci === charIdx;
                return (
                  <span
                    key={ci}
                    className={cn(cls, isCursor && "border-l-2 border-primary")}
                  >
                    {ch}
                  </span>
                );
              })}
              {wi < words.length - 1 ? (
                <span className="text-muted-foreground">{" "}</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

/** End-of-run report. The `preview` flag drops the interactive bits
 *  (replay button, restart hint footer) so this same component can
 *  render inside the customise → Result preview. The visual body is
 *  identical so settings tweaks read 1:1 against the live screen. */
export function TestSummary({ preview = false }: { preview?: boolean } = {}) {
  const { state, wpm, raw, accuracy, elapsedMs, wpmHistory } = usePractice();
  const { prefs: appearance } = useAppearancePrefs();
  const [replaying, setReplaying] = useState(false);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const onDownload = useCallback(async () => {
    const node = captureRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const bg =
        getComputedStyle(document.documentElement).getPropertyValue(
          "--background",
        ).trim() || "#ffffff";
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: bg,
        filter: (n) => !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-result-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[test-summary] screenshot failed", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  // PB detection. Runs once per finished run — compares the just-
  // completed WPM against the localStorage-cached PB for the same
  // (mode, length) bucket. When it beats the cache, flip isNewPb on
  // for this render so the crown badge + sparkle land in the result
  // card. Skipped in preview mode (the customise → Result preview
  // shouldn't trigger live PB writes).
  const [isNewPb, setIsNewPb] = useState(false);
  useEffect(() => {
    if (preview) return;
    if (state.phase !== "done") return;
    const mode = state.mode.toLowerCase();
    const beat = recordIfPb(mode, state.length, wpm);
    if (beat) setIsNewPb(true);
    // We deliberately watch only mode/length/wpm here so a hot-render
    // doesn't re-evaluate. The effect fires once when phase=done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);
  // Convert the live wpmHistory samples into chart buckets keyed by
  // whole-second markers. monkeytype draws its WPM trace from exactly
  // this stream.
  const buckets = useMemo<Bucket[]>(
    () =>
      wpmHistory.map((s) => ({
        sec: Math.max(1, Math.round(s.t / 1000)),
        wpm: s.wpm,
        raw: s.raw,
      })),
    [wpmHistory],
  );
  const peak = Math.round(peakWpm(buckets));
  const avg = Math.round(avgWpm(buckets));
  const stall = Math.round(stallWpm(buckets));
  const cons = consistencyScore(buckets);
  const wrongTotal = state.events.filter((e) => !e.correct).length;
  const elapsedSec = Math.max(1, Math.round(elapsedMs / 1000));
  // Raw comes straight from the practice state now — same monkeytype
  // formula as WPM but without the "only-perfect-words" filter.
  const rawWpm = raw;
  const modeLabel =
    state.mode === "TIME"
      ? `time ${state.length}`
      : state.mode === "QUOTE"
        ? "quote"
        : `words ${state.length}`;

  if (replaying) {
    return (
      <ReplayView
        words={state.words}
        events={state.events}
        onExit={() => setReplaying(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-y-auto px-2 py-3 sm:px-4 sm:py-6">
      {/* my-auto keeps the content vertically centred when it fits in
       *  the viewport; once it overflows, the auto margin collapses
       *  and the natural overflow-y-auto scroll takes over. */}
      <div
        ref={captureRef}
        className="my-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6"
      >
        {/* Top row: stat column on the left, smaller centered chart. */}
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[140px_1fr] sm:gap-6 lg:grid-cols-[160px_1fr]">
          <div className="flex flex-row items-baseline gap-6 sm:flex-col sm:items-start sm:gap-4">
            <BigStat
              label={SPEED_UNIT_LABEL[appearance.typingSpeedUnit]}
              value={formatSpeed(
                wpm,
                appearance.typingSpeedUnit,
                appearance.alwaysShowDecimal,
              )}
              accent
              pb={isNewPb}
            />
            <BigStat
              label="acc"
              value={
                appearance.alwaysShowDecimal
                  ? `${(Math.round(accuracy * 10) / 10).toFixed(1)}%`
                  : `${Math.round(accuracy * 10) / 10}%`
              }
              accent
            />
            <div className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              <div>test type</div>
              <div className="mt-1 text-foreground">{modeLabel}</div>
              <div className="text-foreground">english</div>
            </div>
          </div>
          <div className="w-full">
            <ResultChart
              buckets={buckets}
              events={state.events}
              startAtZero={appearance.startGraphsAtZero}
            />
          </div>
        </div>

        {/* Inline stats row — all seven on a single line at sm+,
         *  same shape as the original 4-up strip just wider; mobile
         *  still wraps in a 2-column grid. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-7 sm:gap-x-5">
          <BigStat
            label="raw"
            value={formatSpeed(
              rawWpm,
              appearance.typingSpeedUnit,
              appearance.alwaysShowDecimal,
            )}
            accent
          />
          <BigStat label="peak" value={peak} accent />
          <BigStat label="avg" value={avg} />
          <BigStat label="stall" value={stall} />
          <BigStat label="consistency" value={`${cons}%`} />
          <BigStat label="errors" value={wrongTotal} />
          <BigStat label="time" value={`${elapsedSec}s`} />
        </div>

        {/* Run shape — extra stats: streak, words, pauses. */}
        {appearance.resultShowExtras ? (
          <ExtraStats
            events={state.events}
            totalWords={state.words.length}
          />
        ) : null}

        {/* Two-column insight grid at lg+: per-letter slowness on
         *  the left, hand balance on the right. Stacks as one column
         *  on smaller viewports. */}
        {appearance.resultShowPerLetter || appearance.resultShowHandBalance ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {appearance.resultShowPerLetter ? (
              <PerLetterSlowness events={state.events} />
            ) : null}
            {appearance.resultShowHandBalance ? (
              <HandBalance events={state.events} />
            ) : null}
          </div>
        ) : null}

        {/* Heatmap strip — speed-coloured passage. */}
        {appearance.resultShowHeatmap && state.words.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>passage heatmap</span>
              <span className="text-muted-foreground/70">
                fast → slow · hover for ms
              </span>
            </div>
            <PassageHeatmap words={state.words} events={state.events} />
          </div>
        ) : null}

        {/* Restart hint — quiet footer. Hidden in preview so the
         *  customise card doesn't show a replay button that would
         *  enter ReplayView inside a settings page. */}
        {preview ? null : (
          <div
            data-no-export="true"
            className="flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span className="rounded-sm border border-border bg-card px-2 py-1 font-mono normal-case text-foreground">
              tab
            </span>
            <span>restart · peak {peak}</span>
            {state.events.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplaying(true)}
                className="text-[11px] uppercase tracking-[0.18em]"
              >
                ▶ replay
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              disabled={exporting}
              aria-label="Save results as image"
              className="gap-1.5 text-[11px] uppercase tracking-[0.18em]"
            >
              <Download size={13} className="shrink-0" />
              {exporting ? "saving" : "save image"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
