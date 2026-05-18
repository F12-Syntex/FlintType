import type { Metadata } from "next";
import { getAppVersion } from "@/server/version";
import { buildPageMetadata } from "@/server/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card.
 *
 *  Design intent — earn attention at three viewing sizes:
 *
 *    1. Thumb (200 × 100 in a timeline): the wordmark, the ember
 *       ADAPTIVE pill, and the dark stat band must read. Hero
 *       passage truncates to "the quick brown fox" and is still
 *       recognisable.
 *    2. Inline (600 × 315 LinkedIn/Facebook): the four-column
 *       capability strip (Models / Drills / Customisation / Races)
 *       comes into focus and communicates the engineering depth.
 *    3. Full (1500 × 787 detail view): the bigram model preview,
 *       the per-feature counts, and the WPM/ACC/GAIN stat strip
 *       are all legible — the card reads as a substantive product
 *       page, not a logo on a colour.
 *
 *  Painted from the fixed `ft-*` paper-and-ink palette so every
 *  screenshot looks identical regardless of the viewer's theme. */
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
      data-screenshot-target="og-card"
      style={{ width: W, height: H }}
      className="relative grid shrink-0 grid-rows-[auto_1fr_auto_auto] overflow-hidden bg-ft-paper text-ft-ink shadow-2xl shadow-black/30 ring-1 ring-ft-line-soft"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[6px] bg-ft-ember"
      />
      <Header version={version} />
      <Passage />
      <CapabilityStrip />
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

/** Loud ember pill — the headline feature. Sparkline + word "Adaptive"
 *  + a small detail string ("tracks 4 models") so a viewer who reads
 *  the pill gets the technical anchor too. */
function AdaptiveBadge() {
  return (
    <div
      className="flex items-center gap-4 bg-ft-ember px-6 py-3 text-ft-paper"
      style={{ boxShadow: "0 12px 30px -10px rgba(225, 88, 44, 0.55)" }}
    >
      <Sparkline />
      <div className="flex flex-col items-start leading-tight">
        <span
          className="font-bold uppercase"
          style={{ fontSize: 22, letterSpacing: "0.16em" }}
        >
          Adaptive
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] opacity-90">
          4 models · per-keystroke
        </span>
      </div>
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

function Passage() {
  const HERO_PX = 80;
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
            textDecorationThickness: 4,
            textUnderlineOffset: 12,
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
        width: 5,
        height: px,
        marginLeft: -2.5,
        marginRight: -2.5,
        transform: `translateY(${Math.round(px * 0.18)}px)`,
      }}
    />
  );
}

/* ─── Capability strip ─────────────────────────────────────────── */

/** Four-column inventory band that answers "but what does it actually
 *  do?" in the same glance as the hero. Each column = one capability
 *  axis with a labelled count and the technical detail underneath.
 *  Reads as a stat strip; communicates "this is engineered, not just
 *  themed". */
function CapabilityStrip() {
  return (
    <div className="grid grid-cols-4 border-y border-ft-line-soft bg-ft-paper-2">
      <Cap
        label="Models"
        count="4"
        detail="bigram · trigram · word · motor"
      />
      <Cap
        label="Drills"
        count="12"
        detail="burst + sudden-death · model-fed"
      />
      <Cap
        label="Customise"
        count="47"
        detail="prefs · 24 themes · focus mode"
      />
      <Cap
        label="Races"
        count="4P"
        detail="real-time SSE · bots · challenges"
        last
      />
    </div>
  );
}

function Cap({
  label,
  count,
  detail,
  last = false,
}: {
  label: string;
  count: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 px-10 py-7 ${
        last ? "" : "border-r border-ft-line-soft"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-ft-dim">
          {label}
        </span>
        <span
          className="font-mono tabular-nums text-ft-ink"
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}
        >
          {count}
        </span>
      </div>
      <span className="text-[14px] font-medium leading-tight text-ft-ink/85">
        {detail}
      </span>
    </div>
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */

function Footer() {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-12 bg-ft-ink px-16 py-9 text-ft-paper">
      <div className="flex flex-col gap-3">
        <span className="text-[15px] font-semibold uppercase tracking-[0.26em] text-ft-warm-2">
          Open source · MIT
        </span>
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: 30, letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          A typing test that learns your weakest bigrams.
        </span>
        <span className="mt-1 text-[15px] font-medium uppercase tracking-[0.22em] text-ft-ember">
          flinttype.app
        </span>
      </div>
      <div className="flex items-end gap-10 border-l border-white/15 pl-10">
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
        style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.045em" }}
      >
        {value}
      </span>
      <span className="mt-3 text-[12px] font-semibold uppercase tracking-[0.3em] text-ft-warm-2">
        {label}
      </span>
    </div>
  );
}
