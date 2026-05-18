import { ImageResponse } from "next/og";

export const alt = "flinttype — adaptive typing speed test";
export const size = { width: 1500, height: 787 };
export const contentType = "image/png";
// 24h cache — the card is brand chrome, not session-dependent. Lets
// Vercel/CDN serve it from edge for repeat scrapes.
export const revalidate = 86_400;

/** Next.js file-based OG image. When any page in the app root is
 *  scraped (Twitter, Discord, Slack, iMessage, Facebook), Next.js
 *  injects this image's URL into `<meta property="og:image">` and
 *  `<meta name="twitter:image">` automatically — no per-page wiring
 *  required.
 *
 *  Mirrors the /card page design but renders with Satori (via
 *  `next/og`) instead of the browser, because social scrapers expect
 *  a binary image at the og:image URL, not an HTML page. Satori
 *  supports a *subset* of CSS — flex only, no grid, no CSS vars, hex
 *  colours — so this file repeats the layout rather than importing
 *  the JSX from /card. Both files together form the contract: edit
 *  /card for the human-screenshot story, edit this file for what
 *  social platforms see. Prose, stats, hairlines, and tokens must
 *  stay in sync. */
export default async function OpengraphImage() {
  const [mono500, mono600, mono700, mono800] = await Promise.all([
    loadFont("JetBrains+Mono", 500),
    loadFont("JetBrains+Mono", 600),
    loadFont("JetBrains+Mono", 700),
    loadFont("JetBrains+Mono", 800),
  ]);

  // Warm-ink ramp (docs/ui-law.md §2.3) — fixed across themes so
  // every screenshot is identical regardless of viewer palette.
  const INK_DEEP = "#0A0A09";
  const INK_LINE = "#221F1A";
  const PAPER = "#F2EDE2";
  const WARM_1 = "#B5AF9F";
  const WARM_3 = "#6E695F";
  const WARM_4 = "#5C5950";
  const EMBER = "#E1582C";
  const PASSAGE_PX = 56;

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
        {/* 3px ember rule — brand spark visible even at thumb size */}
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

        {/* Header — slim rail, run-metadata on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 32,
            paddingBottom: 32,
            borderBottom: `1px solid ${INK_LINE}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img
              src={LOGO_DATA_URL}
              alt=""
              width={26}
              height={44}
              style={{ display: "block" }}
            />
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                color: PAPER,
                lineHeight: 1,
              }}
            >
              flinttype
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
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
              Words · 50
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
              0:34
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{ width: 8, height: 8, backgroundColor: EMBER }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.26em",
                  color: EMBER,
                  lineHeight: 1,
                }}
              >
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Passage — three-line mid-run snapshot. Block is flush-left
            but the block itself is centered horizontally inside the
            card via outer flex justifyContent:center. */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: 80,
            paddingRight: 80,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: PASSAGE_PX,
                lineHeight: 1.36,
                letterSpacing: "-0.018em",
                fontWeight: 500,
                color: PAPER,
              }}
            >
              your hands learn the keys you keep
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: PASSAGE_PX,
                lineHeight: 1.36,
                letterSpacing: "-0.018em",
                fontWeight: 500,
              }}
            >
              <span style={{ color: PAPER }}>missing, the rhythm tigh</span>
              <span
                style={{
                  display: "flex",
                  width: 4,
                  height: PASSAGE_PX * 0.78,
                  backgroundColor: EMBER,
                  marginLeft: 2,
                  marginRight: 2,
                }}
              />
              <span style={{ color: WARM_4 }}>tens, and</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: PASSAGE_PX,
                lineHeight: 1.36,
                letterSpacing: "-0.018em",
                fontWeight: 500,
                color: WARM_4,
              }}
            >
              the slips quietly disappear.
            </div>
          </div>
        </div>

        {/* Footer — stat strip + baseline caption. Four equal columns
            (flex with width:25%) and one ember accent (WPM) matching
            the caret above. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            borderTop: `1px solid ${INK_LINE}`,
            paddingLeft: 56,
            paddingRight: 56,
            paddingTop: 36,
            paddingBottom: 36,
          }}
        >
          <div style={{ display: "flex" }}>
            <StatCell label="WPM" value="124" accent ember={EMBER} warm1={WARM_1} warm3={WARM_3} />
            <StatCell label="ACC" value="98%" ember={EMBER} warm1={WARM_1} warm3={WARM_3} />
            <StatCell label="BURST" value="148" ember={EMBER} warm1={WARM_1} warm3={WARM_3} />
            <StatCell label="WORD" value="32/50" ember={EMBER} warm1={WARM_1} warm3={WARM_3} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${INK_LINE}`,
              paddingTop: 28,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
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
              Learns the bigrams you keep missing
            </span>
          </div>
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

/** Equal-width stat column. WPM is the ember accent; the rest sit in
 *  the warm-1 tone so the eye lands on WPM first. */
function StatCell({
  label,
  value,
  accent = false,
  ember,
  warm1,
  warm3,
}: {
  label: string;
  value: string;
  accent?: boolean;
  ember: string;
  warm1: string;
  warm3: string;
}) {
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
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.28em",
          color: warm3,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          color: accent ? ember : warm1,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Fetch a single Google Fonts weight as a raw font binary suitable
 *  for ImageResponse. The CSS endpoint returns a stylesheet whose
 *  `src: url(...)` points at the actual file; we extract and fetch.
 *  Spoofing the user-agent is what makes Google serve a TTF/WOFF2
 *  (otherwise it sometimes returns a redirect chain). */
async function loadFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
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

/** Inline SVG flame logo as a data URL — avoids any file-system
 *  read at render time and works in every Next.js runtime. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 100"><defs><linearGradient id="ft-flame" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="45%" stop-color="#f97316"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M 30 0 Q 56 18 60 42 Q 56 70 48 88 Q 28 100 12 88 Q 0 65 4 38 Q 8 18 30 0 Z" fill="url(#ft-flame)"/><ellipse cx="20" cy="28" rx="6" ry="14" fill="#ffffff" opacity="0.22"/></svg>`;
const LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;
