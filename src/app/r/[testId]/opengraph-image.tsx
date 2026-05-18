import { ImageResponse } from "next/og";
import { getDatabase } from "@/db/server";
import { BackendError } from "@/lib/errors";
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
const WARM_3 = "#6E695F";
const EMBER = "#E1582C";

/** Dynamic per-run OG image. Mirrors `src/app/opengraph-image.tsx`'s
 *  visual identity (dark warm-ink card, JetBrains Mono, ember spark)
 *  but bakes in this run's numbers + the runner's handle + avatar so
 *  the social preview reads as the artifact, not just brand chrome. */
export default async function RunOpengraphImage({
  params,
}: {
  params: { testId: string };
}) {
  // Share load drives both the card content *and* the avatar URL we
  // need to fetch, so it must come first. Fonts + avatar parallelise
  // around it — the avatar fetch waits for `data` but the four font
  // fetches don't.
  const data = await loadShareSafely(params.testId);
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
  const acc = Math.round(data.accuracy * 10) / 10;
  const initials = data.handle.replace(/^@/, "").slice(0, 2).toUpperCase();
  const lengthLabel = formatLengthLabel(data.mode, data.durationOrWordCount);
  const durationLabel = formatDuration(data.durationSec);

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

        {/* Header — handle pill on the left, mode + duration on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 36,
            paddingBottom: 32,
            borderBottom: `1px solid ${INK_LINE}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              backgroundColor: INK_TRACK,
              border: `1px solid ${INK_LINE}`,
              borderRadius: 8,
              paddingLeft: 18,
              paddingRight: 22,
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            {avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarDataUrl}
                alt=""
                width={48}
                height={48}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  objectFit: "cover",
                  border: `1px solid ${INK_LINE}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: INK_LINE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: WARM_1,
                  letterSpacing: "0.02em",
                }}
              >
                {initials}
              </div>
            )}
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: PAPER,
                lineHeight: 1,
              }}
            >
              {data.handle}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: WARM_3,
                lineHeight: 1,
              }}
            >
              {lengthLabel}
            </span>
            <span
              style={{
                fontSize: 18,
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

        {/* Body — WPM headline, all other numbers below */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 56,
            paddingRight: 56,
            gap: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 28,
            }}
          >
            <span
              style={{
                fontSize: 260,
                fontWeight: 800,
                letterSpacing: "-0.055em",
                color: EMBER,
                lineHeight: 0.9,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {wpm}
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: WARM_3,
              }}
            >
              wpm
            </span>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            <StatCell label="ACC" value={`${acc}%`} />
            <StatCell label="ERRORS" value={String(data.errorCount)} />
            <StatCell label="MODE" value={modeLabel(data.mode)} />
            <StatCell label="DURATION" value={durationLabel} />
          </div>
        </div>

        {/* Footer — URL + tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${INK_LINE}`,
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 28,
            paddingBottom: 28,
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
              fontSize: 14,
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 14,
        width: "25%",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.28em",
          color: WARM_3,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: WARM_1,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Brand-fallback card — rendered when the share id resolves to no
 *  run (NOT_FOUND, deleted, etc.). Better than letting the scraper
 *  see a "broken image" — the click-through page still 404s, but the
 *  social preview is a clean flinttype mark. */
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

async function loadShareSafely(testId: string): Promise<SharedTest | null> {
  try {
    return await loadSharedTest(getDatabase(), testId, logger);
  } catch (err) {
    if (err instanceof BackendError && err.code === "NOT_FOUND") return null;
    logger.warn("share opengraph: loadSharedTest failed", {
      testId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Fetch the runner's Clerk avatar and turn it into a data URL so
 *  Satori can embed it without a second network hop at render time.
 *  Returns null on any failure (404, timeout, non-image content,
 *  null URL): the renderer falls back to initials. */
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

function formatLengthLabel(mode: string, amount: number): string {
  if (mode === "time" || /time/i.test(mode)) return `Time · ${amount}s`;
  if (/quote/i.test(mode)) return `Quote · ${amount}`;
  return `Words · ${amount}`;
}

function modeLabel(mode: string): string {
  if (mode === "race") return "Race";
  if (mode === "training") return "Train";
  if (mode === "reverse_adaptive") return "Easy";
  return "Casual";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
