import type { Metadata } from "next";
import { buildPageMetadata } from "@/server/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card. Painted
 *  from the fixed `ft-*` paper-and-ink palette so every screenshot
 *  looks identical regardless of the viewer's theme.
 *
 *  Three bands top-to-bottom — header (wordmark + ADAPTIVE pill),
 *  hero (the brand's signature typing-surface visual), ink footer
 *  (one-line feature trail + tagline + the WPM/ACC numbers that
 *  prove the product works). Engineering depth is communicated by
 *  the feature trail line in the footer, not a separate strip. */
export default function CardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-200 p-6 dark:bg-zinc-900">
      <Card />
    </main>
  );
}

const W = 1500;
const H = 787;

function Card() {
  return (
    <div
      data-screenshot-target="og-card"
      style={{ width: W, height: H }}
      className="relative grid shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-ft-paper text-ft-ink shadow-2xl shadow-black/30 ring-1 ring-ft-line-soft"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[6px] bg-ft-ember"
      />
      <Header />
      <Passage />
      <Footer />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function Header() {
  return (
    <div className="flex items-center justify-between border-b border-ft-line-soft px-16 pt-14 pb-9">
      <div className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-16 w-auto"
        />
        <span
          className="font-extrabold tracking-tight"
          style={{ fontSize: 52, letterSpacing: "-0.04em" }}
        >
          flinttype
        </span>
      </div>
      <AdaptiveBadge />
    </div>
  );
}

/** Loud ember pill — the headline feature. A five-bar sparkline
 *  (drawn from divs so no SVG dependency in OG screenshotters) plus
 *  the single word "Adaptive" in caps. */
function AdaptiveBadge() {
  return (
    <div
      className="flex items-center gap-4 bg-ft-ember px-6 py-3 text-ft-paper"
      style={{ boxShadow: "0 12px 30px -10px rgba(225, 88, 44, 0.55)" }}
    >
      <Sparkline />
      <span
        className="font-bold uppercase"
        style={{ fontSize: 24, letterSpacing: "0.16em" }}
      >
        Adaptive
      </span>
    </div>
  );
}

function Sparkline() {
  const heights = [10, 16, 22, 18, 28];
  return (
    <div className="flex items-end gap-1">
      {heights.map((h, i) => (
        <span
          key={i}
          aria-hidden
          className="block w-[5px] bg-ft-paper"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

/* ─── Hero passage ─────────────────────────────────────────────── */

/** Two forced lines so the passage never browser-wraps at an awkward
 *  point. Each line is its own block-level element; both fit
 *  comfortably inside (W − 2·px-16) at the chosen HERO_PX. */
function Passage() {
  const HERO_PX = 88;
  const lineStyle = {
    fontSize: HERO_PX,
    lineHeight: 1.14,
    letterSpacing: "-0.02em",
    fontWeight: 500,
    display: "block",
    whiteSpace: "nowrap" as const,
  };
  return (
    <div className="flex flex-col justify-center px-16">
      <p className="font-mono">
        <span style={lineStyle}>
          <span className="text-ft-ember">the&nbsp;quick&nbsp;brown</span>
          <span className="text-ft-dim-2">&nbsp;fox&nbsp;jumps</span>
        </span>
        <span style={lineStyle}>
          <span className="text-ft-dim-2">over&nbsp;the&nbsp;</span>
          <span
            className="text-ft-ember"
            style={{
              textDecoration: "underline",
              textDecorationColor: "#E1582C",
              textDecorationThickness: 4,
              textUnderlineOffset: 12,
            }}
          >
            lazy
          </span>
          <span className="text-ft-dim-2">&nbsp;dog,&nbsp;cof</span>
          <CaretInline px={HERO_PX} />
          <span className="text-ft-dim-2">fee.</span>
        </span>
      </p>
    </div>
  );
}

function CaretInline({ px }: { px: number }) {
  return (
    <span
      aria-hidden
      className="inline-block bg-ft-ember align-baseline"
      style={{
        width: 5,
        height: px,
        marginLeft: -2.5,
        marginRight: -2.5,
        transform: `translateY(${Math.round(px * 0.18)}px)`,
      }}
    />
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */

/** Dark-ink band that splits the card into two halves. Single-line
 *  feature trail at the top hints at the engineering depth without a
 *  separate inventory strip; tagline names the actual differentiator;
 *  WPM / ACC anchor the right edge. */
/** Two-column layout with explicit widths so neither side reflows on
 *  copy edits. Left column carries eyebrow / tagline / URL (all on
 *  their own single line — content is sized to fit without wrapping
 *  at the chosen font sizes). Right column carries the two stats
 *  with a clean border-left divider. */
function Footer() {
  return (
    <div
      className="grid items-center gap-10 bg-ft-ink px-16 py-10 text-ft-paper"
      style={{ gridTemplateColumns: "1fr 360px" }}
    >
      <div className="flex flex-col gap-3">
        <span
          className="whitespace-nowrap text-[14px] font-semibold uppercase tracking-[0.26em] text-ft-warm-2"
        >
          Models · Drills · Races · Open source
        </span>
        <span
          className="whitespace-nowrap font-semibold tracking-tight"
          style={{ fontSize: 34, letterSpacing: "-0.02em" }}
        >
          Learns your weakest bigrams.
        </span>
        <span className="mt-1 whitespace-nowrap text-[15px] font-medium uppercase tracking-[0.22em] text-ft-ember">
          flinttype.app
        </span>
      </div>
      <div className="flex items-end justify-end gap-10 border-l border-white/15 pl-10">
        <StatBlock label="WPM" value="124" />
        <StatBlock label="ACC" value="98%" accent />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className={`font-mono tabular-nums ${
          accent ? "text-ft-ember" : "text-ft-paper"
        }`}
        style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.045em" }}
      >
        {value}
      </span>
      <span className="mt-3 text-[12px] font-semibold uppercase tracking-[0.3em] text-ft-warm-2">
        {label}
      </span>
    </div>
  );
}
