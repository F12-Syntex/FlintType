import { ImageResponse } from "next/og";
import { getDatabase } from "@/db/server";
import { BackendError } from "@/lib/errors";
import { formatClock } from "@/lib/format-duration";
import { shareLengthLabel } from "@/lib/share-length-label";
import { logger } from "@/server/logger";
import { loadSharedTest } from "@/server/routes/share/load";
import type { SharedTest } from "@/types/share";

export const alt = "flinttype run report";
export const size = { width: 1500, height: 787 };
export const contentType = "image/png";
/** 24h revalidate — once a run is shared, its numbers don't change.
 *  Same cadence as the brand-level OG so social scrapers see a stable
 *  per-run preview while we still recover edits to the design (font /
 *  layout tweaks) within a day. */
export const revalidate = 86_400;

// Warm-ink ramp — ui-law §2.3. Fixed across themes so every shared
// card looks identical regardless of viewer palette.
const INK_DEEP = "#0A0A09";
const INK_TRACK = "#1A1815";
const INK_LINE = "#221F1A";
const PAPER = "#F2EDE2";
const WARM_1 = "#B5AF9F";
const WARM_2 = "#9C978A";
const WARM_3 = "#6E695F";
const WARM_4 = "#5C5950";
const EMBER = "#E1582C";

/** Dynamic per-run OG image — mirrors the post-test results screen.
 *
 *  Layout:
 *
 *      [handle]                                   MODE · LEN · TIME
 *      ─────────────────────────────────────────────────────────────
 *      WPM                  WPM trace (per-second line chart)
 *      ACC
 *      type · english
 *      ─────────────────────────────────────────────────────────────
 *      raw   peak   avg   stall   consistency   errors   time
 *      ─────────────────────────────────────────────────────────────
 *      flinttype.com                                  /share/<slug>
 *
 *  The chart + roll-up stats render from columns persisted on submit
 *  (`wpmHistory`, `rawWpm`, `peakWpm`, …). Legacy rows submitted before
 *  those columns landed still render — the chart panel collapses to a
 *  brand mark and the stat row shows only the fields we have. */
export default async function RunOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await loadShareSafely(params.slug);
  const [mono500, mono600, mono700, mono800, avatarDataUrl] =
    await Promise.all([
      loadFont("JetBrains+Mono", 500),
      loadFont("JetBrains+Mono", 600),
      loadFont("JetBrains+Mono", 700),
      loadFont("JetBrains+Mono", 800),
      loadAvatarFromUrl(data?.avatarUrl ?? null),
    ]);

  if (!data) return renderFallback({ mono500, mono600, mono700, mono800 });

  const wpm = Math.round(data.wpm);
  const acc = roundDecimal(data.accuracy);
  const initials = data.handle.replace(/^@/, "").slice(0, 2).toUpperCase();
  const lengthLabel = shareLengthLabel(data.lengthMode, data.durationOrWordCount);
  const durationLabel = formatClock(data.durationSec);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK_DEEP,
          color: PAPER,
          fontFamily: "JetBrains Mono",
          position: "relative",
        }}
      >
        {/* 3px ember rule — brand spark, visible even at thumb size */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: EMBER,
          }}
        />

        {/* Header — handle pill on the left, run metadata on the right */}
        <Header
          handle={data.handle}
          avatarDataUrl={avatarDataUrl}
          initials={initials}
          lengthLabel={lengthLabel}
          durationLabel={durationLabel}
          modeLabel={modeLabel(data.mode)}
        />

        {/* Body — big WPM/ACC on the left, WPM trace chart on the right.
            Mirrors the post-test summary layout the user just saw. */}
        <Body data={data} wpm={wpm} acc={acc} />

        {/* Seven-stat row — exact same set the live summary renders. */}
        <StatRow
          rawWpm={pickStat(data.rawWpm, wpm)}
          peakWpm={pickStat(data.peakWpm, wpm)}
          avgWpm={pickStat(data.avgWpm, wpm)}
          stallWpm={pickStat(data.stallWpm, wpm)}
          consistency={data.consistency != null ? Math.round(data.consistency) : null}
          errorCount={data.errorCount}
          durationLabel={`${data.durationSec}s`}
        />

        {/* Footer — URL + slug callout */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${INK_LINE}`,
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 22,
            paddingBottom: 22,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: PAPER,
              lineHeight: 1,
            }}
          >
            flinttype.com
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: WARM_3,
              lineHeight: 1,
            }}
          >
            Take the same test →
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "JetBrains Mono", data: mono500, weight: 500, style: "normal" },
        { name: "JetBrains Mono", data: mono600, weight: 600, style: "normal" },
        { name: "JetBrains Mono", data: mono700, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: mono800, weight: 800, style: "normal" },
      ],
    },
  );
}

/* ─── Header ─────────────────────────────────────────────────────── */

function Header({
  handle,
  avatarDataUrl,
  initials,
  lengthLabel,
  durationLabel,
  modeLabel,
}: {
  handle: string;
  avatarDataUrl: string | null;
  initials: string;
  lengthLabel: string;
  durationLabel: string;
  modeLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 56,
        paddingRight: 56,
        paddingTop: 28,
        paddingBottom: 24,
        borderBottom: `1px solid ${INK_LINE}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          backgroundColor: INK_TRACK,
          border: `1px solid ${INK_LINE}`,
          borderRadius: 8,
          paddingLeft: 14,
          paddingRight: 20,
          paddingTop: 9,
          paddingBottom: 9,
        }}
      >
        {avatarDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarDataUrl}
            alt=""
            width={40}
            height={40}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              objectFit: "cover",
              border: `1px solid ${INK_LINE}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: INK_LINE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: WARM_1,
            }}
          >
            {initials}
          </div>
        )}
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            color: PAPER,
            lineHeight: 1,
          }}
        >
          {handle}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: WARM_3,
            lineHeight: 1,
          }}
        >
          {modeLabel} · {lengthLabel}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: WARM_1,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {durationLabel}
        </span>
      </div>
    </div>
  );
}

/* ─── Body (WPM/ACC headline + chart) ───────────────────────────── */

function Body({
  data,
  wpm,
  acc,
}: {
  data: SharedTest;
  wpm: number;
  acc: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 56,
        paddingRight: 56,
        paddingTop: 28,
        paddingBottom: 28,
        gap: 56,
      }}
    >
      {/* Left column — big WPM headline mirroring TestSummary */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          width: 280,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: WARM_3,
              lineHeight: 1,
            }}
          >
            wpm
          </span>
          <span
            style={{
              fontSize: 132,
              fontWeight: 800,
              letterSpacing: "-0.055em",
              color: EMBER,
              lineHeight: 0.9,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {wpm}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: WARM_3,
              lineHeight: 1,
            }}
          >
            acc
          </span>
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: EMBER,
              lineHeight: 0.95,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {acc}%
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: WARM_3,
            }}
          >
            test type
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: PAPER,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {shareLengthLabel(data.lengthMode, data.durationOrWordCount).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Right column — WPM trace chart, or graceful empty state */}
      <div
        style={{
          display: "flex",
          flex: 1,
          height: 320,
          alignItems: "stretch",
          justifyContent: "stretch",
        }}
      >
        {data.wpmHistory && data.wpmHistory.length >= 2 ? (
          <WpmTraceChart history={data.wpmHistory} />
        ) : (
          <ChartUnavailable />
        )}
      </div>
    </div>
  );
}

/* ─── WPM trace chart (SVG) ─────────────────────────────────────── */

function WpmTraceChart({
  history,
}: {
  history: NonNullable<SharedTest["wpmHistory"]>;
}) {
  const W = 880;
  const H = 320;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 24;
  const padBottom = 36;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const wpms = history.map((s) => s.wpm);
  const raws = history.map((s) => s.raw);
  const yMax = Math.max(...wpms, ...raws, 1) * 1.1;
  const yMin = 0;
  const tMax = Math.max(history[history.length - 1]!.t, 1);

  const x = (t: number) => padLeft + (t / tMax) * plotW;
  const y = (v: number) => padTop + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const wpmPath = pathFor(history.map((s) => [x(s.t), y(s.wpm)] as const));
  const rawPath = pathFor(history.map((s) => [x(s.t), y(s.raw)] as const));

  // Gridline ticks — pick 4 evenly-spaced y-values rounded to a
  // human-readable scale, then label them. The labels live to the
  // LEFT of the chart so the line itself spans the full width.
  const niceMax = niceCeil(yMax);
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block" }}
    >
      {/* Gridlines */}
      {yTicks.map((v) => (
        <line
          key={`g${v}`}
          x1={padLeft}
          x2={W - padRight}
          y1={y(v)}
          y2={y(v)}
          stroke={INK_LINE}
          strokeWidth={1}
        />
      ))}
      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text
          key={`l${v}`}
          x={padLeft - 8}
          y={y(v) + 4}
          fontFamily="JetBrains Mono"
          fontSize={12}
          fontWeight={500}
          fill={WARM_3}
          textAnchor="end"
        >
          {Math.round(v)}
        </text>
      ))}
      {/* Raw WPM (dimmer, underneath) */}
      <path d={rawPath} stroke={WARM_4} strokeWidth={2} fill="none" />
      {/* WPM (accent, on top) */}
      <path d={wpmPath} stroke={EMBER} strokeWidth={3.5} fill="none" />
      {/* X-axis caption */}
      <text
        x={padLeft}
        y={H - 10}
        fontFamily="JetBrains Mono"
        fontSize={11}
        fontWeight={500}
        fill={WARM_3}
        letterSpacing="0.22em"
      >
        WPM TRACE · {Math.round(tMax / 1000)}s
      </text>
      <text
        x={W - padRight}
        y={H - 10}
        fontFamily="JetBrains Mono"
        fontSize={11}
        fontWeight={500}
        fill={WARM_4}
        textAnchor="end"
        letterSpacing="0.18em"
      >
        ember = wpm · grey = raw
      </text>
    </svg>
  );
}

function ChartUnavailable() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        border: `1px dashed ${INK_LINE}`,
        borderRadius: 8,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          color: WARM_3,
        }}
      >
        WPM trace
      </span>
      <span
        style={{
          fontSize: 14,
          color: WARM_4,
          fontWeight: 500,
        }}
      >
        not recorded for this run
      </span>
    </div>
  );
}

/* ─── Stat row ───────────────────────────────────────────────────── */

function StatRow({
  rawWpm,
  peakWpm,
  avgWpm,
  stallWpm,
  consistency,
  errorCount,
  durationLabel,
}: {
  rawWpm: number | null;
  peakWpm: number | null;
  avgWpm: number | null;
  stallWpm: number | null;
  consistency: number | null;
  errorCount: number;
  durationLabel: string;
}) {
  const cells: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "raw", value: fmtNum(rawWpm), accent: true },
    { label: "peak", value: fmtNum(peakWpm), accent: true },
    { label: "avg", value: fmtNum(avgWpm) },
    { label: "stall", value: fmtNum(stallWpm) },
    {
      label: "consistency",
      value: consistency != null ? `${consistency}%` : "—",
    },
    { label: "errors", value: String(errorCount) },
    { label: "time", value: durationLabel },
  ];
  return (
    <div
      style={{
        display: "flex",
        borderTop: `1px solid ${INK_LINE}`,
        paddingLeft: 56,
        paddingRight: 56,
        paddingTop: 26,
        paddingBottom: 26,
        gap: 20,
      }}
    >
      {cells.map((c) => (
        <StatCell key={c.label} {...c} />
      ))}
    </div>
  );
}

function StatCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          color: WARM_3,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "-0.035em",
          color: accent ? EMBER : PAPER,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Fallback (404 / unknown run) ──────────────────────────────── */

function renderFallback(fonts: {
  mono500: ArrayBuffer;
  mono600: ArrayBuffer;
  mono700: ArrayBuffer;
  mono800: ArrayBuffer;
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: INK_DEEP,
          color: PAPER,
          fontFamily: "JetBrains Mono",
          gap: 24,
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.05em",
            color: PAPER,
          }}
        >
          flinttype
        </span>
        <span
          style={{
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            color: WARM_3,
          }}
        >
          Run unavailable
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "JetBrains Mono", data: fonts.mono500, weight: 500, style: "normal" },
        { name: "JetBrains Mono", data: fonts.mono600, weight: 600, style: "normal" },
        { name: "JetBrains Mono", data: fonts.mono700, weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: fonts.mono800, weight: 800, style: "normal" },
      ],
    },
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

async function loadShareSafely(slug: string): Promise<SharedTest | null> {
  try {
    return await loadSharedTest(getDatabase(), slug, logger);
  } catch (err) {
    if (err instanceof BackendError && err.code === "NOT_FOUND") return null;
    logger.warn("share opengraph: loadSharedTest failed", {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function loadAvatarFromUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ctype = res.headers.get("content-type") ?? "image/png";
    return `data:${ctype};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function modeLabel(mode: string): string {
  if (mode === "race") return "Race";
  if (mode === "training") return "Training";
  if (mode === "reverse_adaptive") return "Reverse";
  return "Casual";
}


function roundDecimal(v: number): number {
  return Math.round(v * 10) / 10;
}

function fmtNum(v: number | null): string {
  if (v == null) return "—";
  return String(Math.round(v));
}

/** When the live stat field is null on a legacy row, the share card
 *  still shows something — usually the headline WPM repeats. Better
 *  to show a sensible placeholder than render an em-dash where the
 *  user expects a number. */
function pickStat(value: number | null, fallback: number): number | null {
  return value ?? fallback;
}

/** Build an SVG path string from (x, y) points. The first point is
 *  `M`, the rest are `L`. */
function pathFor(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return "";
  return points
    .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`)
    .join(" ");
}

/** Round a number up to a "nice" axis ceiling (multiple of 10/25/50/100
 *  depending on magnitude) so the gridline labels read cleanly rather
 *  than as exact data extremes. */
function niceCeil(v: number): number {
  if (v <= 25) return Math.ceil(v / 5) * 5;
  if (v <= 100) return Math.ceil(v / 10) * 10;
  if (v <= 250) return Math.ceil(v / 25) * 25;
  return Math.ceil(v / 50) * 50;
}

async function loadFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&display=swap`;
  const css = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  }).then((r) => r.text());
  const match = css.match(/url\((https:\/\/[^)]+)\)/);
  if (!match) {
    throw new Error(`Could not extract ${family} ${weight} url from CSS`);
  }
  return fetch(match[1]!).then((r) => r.arrayBuffer());
}
