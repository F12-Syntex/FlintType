import type { Metadata } from "next";
import { getAppVersion } from "@/server/version";
import { buildPageMetadata } from "@/server/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card. Renders at a
 *  fixed pixel size so a screenshot tool — Vercel OG, Puppeteer, manual
 *  Cmd-Shift-4 — produces an asset usable as og:image / twitter:image
 *  without further cropping. The card paints from the *fixed*
 *  paper-and-ink palette (`ft-*` tokens) rather than the user's chosen
 *  theme so every capture looks the same regardless of the viewer's
 *  current mode / palette — the card is brand-stable by design.
 *
 *  Composition foregrounds three things the brand wants the social
 *  thumbnail to communicate, in order:
 *    1. flinttype is a typing test (massive hero passage)
 *    2. it's adaptive (loud ember badge, sparkline, tagline)
 *    3. open source + numbers earned (footer stat strip) */
export default function CardPage() {
  const version = getAppVersion();
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-200 p-6 dark:bg-zinc-900">
      <Card version={version} />
    </main>
  );
}

const W = 1500;
const H = 787;

function Card({ version }: { version: string }) {
  return (
    <div
      // data-screenshot-target — automation can locate the card without
      // grabbing the surrounding page chrome.
      data-screenshot-target="og-card"
      style={{ width: W, height: H }}
      className="relative grid shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-ft-paper text-ft-ink shadow-2xl shadow-black/30 ring-1 ring-ft-line-soft"
    >
      {/* A 6px ember rule pinned to the top edge — a single confident
       *  brand spark visible even when the card is rendered at 200×100
       *  in a Twitter timeline. Doesn't compete with the hero. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[6px] bg-ft-ember"
      />

      <Header version={version} />
      <Passage />
      <Footer />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function Header({ version }: { version: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ft-line-soft px-16 pt-12 pb-7">
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
        <span className="ml-4 mt-2 self-end text-[14px] font-medium uppercase tracking-[0.22em] text-ft-dim">
          v{version}
        </span>
      </div>
      <AdaptiveBadge />
    </div>
  );
}

/** Loud ember pill — the headline feature on the card. Renders the
 *  word ADAPTIVE big enough to read at thumb size, with a tiny
 *  three-bar sparkline that telegraphs "this thing tracks you over
 *  time". The pill is the second-largest typographic element on the
 *  card after the hero passage. */
function AdaptiveBadge() {
  return (
    <div
      className="flex items-center gap-4 bg-ft-ember px-6 py-3 text-ft-paper"
      style={{ boxShadow: "0 12px 30px -10px rgba(225, 88, 44, 0.55)" }}
    >
      <Sparkline />
      <span
        className="font-bold uppercase"
        style={{ fontSize: 22, letterSpacing: "0.16em" }}
      >
        Adaptive
      </span>
    </div>
  );
}

/** Five-bar ascending sparkline drawn from primitive divs — no SVG so
 *  it can never miss a font-load or fail to render in OG-image
 *  screenshotters that don't ship full SVG support. */
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

/** The hero. Single passage, big, with the brand's signature visual
 *  vocabulary: typed letters in primary (ember), an inline live caret
 *  bar mid-word, untyped tail in muted ink, one error word
 *  underlined in ember. Sized so the second line still reads at
 *  thumbnail. */
function Passage() {
  const HERO_PX = 96;
  return (
    <div className="flex flex-col justify-center px-16">
      <p
        className="font-mono"
        style={{
          fontSize: HERO_PX,
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          fontWeight: 500,
        }}
      >
        <span className="text-ft-ember">the&nbsp;quick&nbsp;brown</span>
        <span className="text-ft-dim-2">&nbsp;fox&nbsp;jumps&nbsp;over&nbsp;the&nbsp;</span>
        <span
          className="text-ft-ember"
          style={{
            textDecoration: "underline",
            textDecorationColor: "#E1582C",
            textDecorationThickness: 5,
            textUnderlineOffset: 14,
          }}
        >
          lazy
        </span>
        <span className="text-ft-dim-2">&nbsp;dog,&nbsp;cof</span>
        <CaretInline px={HERO_PX} />
        <span className="text-ft-dim-2">fee&nbsp;hot.</span>
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
        width: 6,
        height: px,
        marginLeft: -3,
        marginRight: -3,
        transform: `translateY(${Math.round(px * 0.18)}px)`,
      }}
    />
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */

/** Footer band — kept on its own dark-ink surface so the page reads
 *  as two confident halves (paper passage on top, ink stat strip
 *  underneath). Carries the tagline that explains *why* adaptive
 *  matters and the stat block that proves the product works. */
function Footer() {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-12 bg-ft-ink px-16 py-10 text-ft-paper">
      <div className="flex flex-col gap-3">
        <span className="text-[15px] font-semibold uppercase tracking-[0.26em] text-ft-warm-2">
          Practice · Drills · Races
        </span>
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: 34, letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          A typing test that learns your weakest bigrams.
        </span>
        <span className="mt-1 text-[15px] font-medium uppercase tracking-[0.22em] text-ft-ember">
          flinttype.app
        </span>
      </div>
      <div className="flex items-end gap-12 border-l border-white/15 pl-12">
        <StatBlock label="WPM" value="124" />
        <StatBlock label="ACC" value="98%" accent />
        <StatBlock label="GAIN" value="+14%" />
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
