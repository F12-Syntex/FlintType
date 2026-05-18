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
 *  social platforms see. Tagline + numbers + spark must stay in
 *  sync. */
export default async function OpengraphImage() {
  const [mono500, mono700] = await Promise.all([
    loadFont("JetBrains+Mono", 500),
    loadFont("JetBrains+Mono", 700),
  ]);

  const PAPER = "#F2EDE2";
  const INK = "#141414";
  const LINE_SOFT = "#DDD6C5";
  const DIM = "#8C8C8C";
  const DIM_2 = "#595959";
  const EMBER = "#E1582C";
  const WARM_2 = "#9C978A";
  const HERO_PX = 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          color: INK,
          fontFamily: "JetBrains Mono",
          position: "relative",
        }}
      >
        {/* 6px ember rule — brand spark visible even at thumb size */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: EMBER,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 56,
            paddingBottom: 36,
            paddingLeft: 64,
            paddingRight: 64,
            borderBottom: `1px solid ${LINE_SOFT}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img
              src={LOGO_DATA_URL}
              alt=""
              width={48}
              height={80}
              style={{ display: "block" }}
            />
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: INK,
              }}
            >
              flinttype
            </span>
          </div>

          {/* ADAPTIVE pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              backgroundColor: EMBER,
              color: PAPER,
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 24,
              paddingRight: 24,
              boxShadow: "0 12px 30px -10px rgba(225, 88, 44, 0.55)",
            }}
          >
            {/* Sparkline */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
              {[10, 16, 22, 18, 28].map((h, i) => (
                <div
                  key={i}
                  style={{ width: 5, height: h, backgroundColor: PAPER }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
              }}
            >
              Adaptive
            </span>
          </div>
        </div>

        {/* Hero passage — two forced single-line blocks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingLeft: 64,
            paddingRight: 64,
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: HERO_PX,
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            <span style={{ color: EMBER }}>the quick brown</span>
            <span style={{ color: DIM_2 }}>&nbsp;fox jumps</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: HERO_PX,
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            <span style={{ color: DIM_2 }}>over the&nbsp;</span>
            <span
              style={{
                color: EMBER,
                textDecoration: "underline",
                textDecorationColor: EMBER,
                textDecorationThickness: 4,
                textUnderlineOffset: 12,
              }}
            >
              lazy
            </span>
            <span style={{ color: DIM_2 }}>&nbsp;dog, cof</span>
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: HERO_PX * 0.85,
                backgroundColor: EMBER,
                marginLeft: -3,
                marginRight: -3,
              }}
            />
            <span style={{ color: DIM_2 }}>fee.</span>
          </div>
        </div>

        {/* Footer — dark ink band */}
        <div
          style={{
            display: "flex",
            backgroundColor: INK,
            color: PAPER,
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 64,
            paddingRight: 64,
            gap: 40,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.26em",
                color: WARM_2,
              }}
            >
              Models · Drills · Races · Open source
            </span>
            <span
              style={{
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: PAPER,
              }}
            >
              Learns your weakest bigrams.
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: EMBER,
                marginTop: 4,
              }}
            >
              flinttype.app
            </span>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 40,
              borderLeft: "1px solid rgba(255,255,255,0.15)",
              paddingLeft: 40,
              width: 360,
              justifyContent: "flex-end",
            }}
          >
            <StatBlock label="WPM" value="124" color={PAPER} warm={WARM_2} />
            <StatBlock label="ACC" value="98%" color={EMBER} warm={WARM_2} />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "JetBrains Mono",
          data: mono500,
          weight: 500,
          style: "normal",
        },
        {
          name: "JetBrains Mono",
          data: mono700,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}

/** Reusable stat block — flex-only because Satori. */
function StatBlock({
  label,
  value,
  color,
  warm,
}: {
  label: string;
  value: string;
  color: string;
  warm: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      <span
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.3em",
          color: warm,
          marginTop: 12,
        }}
      >
        {label}
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
