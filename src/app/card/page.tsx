import type { Metadata } from "next";
import { buildPageMetadata } from "@/server/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card painted to
 *  read as a screenshot of a real flinttype run — dark warm-ink
 *  surface, real passage with typed / untyped / error letter states,
 *  ember caret mid-keystroke, live stat strip with WPM accented. The
 *  card sits next to other product screenshots in the maker's
 *  portfolio without reading as the odd marketing tile.
 *
 *  Painted from the fixed `ft-*` warm-ink ramp (docs/ui-law.md §2.3)
 *  so every screenshot looks identical regardless of viewer theme. */
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
      className="relative grid shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-ft-ink-deep font-mono text-ft-paper"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-[3px] bg-ft-ember"
      />
      <Header />
      <Passage />
      <Footer />
    </div>
  );
}

/* ─── Header rail ───────────────────────────────────────────────── */

/** Slim app-shell top rail. Mirrors the real app's TopBar shape:
 *  brand mark left, mode + live timer right. The ember dot + LIVE
 *  label is the single instance of ember in this band — keeps the
 *  reader's eye anchored. */
function Header() {
  return (
    <div className="flex items-center justify-between border-b border-ft-ink-line px-14 pt-7 pb-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-10 w-auto"
        />
        <span
          className="font-extrabold tracking-tight text-ft-paper"
          style={{ fontSize: 30, letterSpacing: "-0.04em" }}
        >
          flinttype
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span
          className="font-semibold uppercase text-ft-warm-3"
          style={{ fontSize: 12, letterSpacing: "0.22em" }}
        >
          Words · 50
        </span>
        <span aria-hidden className="block h-3 w-px bg-ft-ink-line" />
        <span
          className="font-medium tabular-nums text-ft-warm-1"
          style={{ fontSize: 15, letterSpacing: "0.04em" }}
        >
          0:34
        </span>
        <span aria-hidden className="block h-3 w-px bg-ft-ink-line" />
        <span className="flex items-center gap-2">
          <span aria-hidden className="block h-[7px] w-[7px] bg-ft-ember" />
          <span
            className="font-bold uppercase text-ft-ember"
            style={{ fontSize: 11, letterSpacing: "0.26em" }}
          >
            Live
          </span>
        </span>
      </div>
    </div>
  );
}

/* ─── Passage ───────────────────────────────────────────────────── */

/** Three lines of editorial prose painted as a mid-run snapshot.
 *  Line 1 fully typed (paper). Line 2 in progress — typed prefix in
 *  paper, ember caret, untyped suffix in warm-4, and the next word
 *  carries the per-letter highlight tint that the real Passage uses
 *  in `next-word` mode. Line 3 untyped (warm-4). One ember caret. */
function Passage() {
  const PASSAGE_PX = 60;
  const lineStyle = {
    fontSize: PASSAGE_PX,
    lineHeight: 1.34,
    letterSpacing: "-0.018em",
    fontWeight: 500,
    display: "block",
    whiteSpace: "nowrap" as const,
  } as const;
  return (
    <div className="flex flex-col justify-center px-20">
      <p
        className="mx-auto"
        style={{ wordSpacing: "0.18em", maxWidth: 1180 }}
      >
        <span style={lineStyle}>
          <span className="text-ft-paper">
            the rhythm settles after the third line
          </span>
        </span>
        <span style={lineStyle}>
          <span className="text-ft-paper">and the cur</span>
          <CaretInline px={PASSAGE_PX} />
          <span className="text-ft-warm-4">sor moves like </span>
          <NextWord text="weather" />
        </span>
        <span style={lineStyle}>
          <span className="text-ft-warm-4">across an open page.</span>
        </span>
      </p>
    </div>
  );
}

/** Tall slim ember bar centered on the baseline — same proportions
 *  as the line-style caret the real Passage renders in its default
 *  caret settings. */
function CaretInline({ px }: { px: number }) {
  return (
    <span
      aria-hidden
      className="inline-block bg-ft-ember align-baseline"
      style={{
        width: 4,
        height: px * 0.95,
        marginLeft: -2,
        marginRight: -2,
        transform: `translateY(${Math.round(px * 0.16)}px)`,
      }}
    />
  );
}

/** The "next word" tint — soft warm wash behind a single upcoming
 *  word so the reader sees the next-letter / next-word highlight
 *  feature without an extra explanatory label. Mirrors the real
 *  Passage's `bg-foreground/10` next-word treatment, painted in
 *  warm-ink terms. */
function NextWord({ text }: { text: string }) {
  return (
    <span
      className="text-ft-warm-1"
      style={{
        backgroundColor: "rgba(181, 175, 159, 0.08)",
        padding: "0 0.18em",
      }}
    >
      {text}
    </span>
  );
}

/* ─── Footer ────────────────────────────────────────────────────── */

/** Stat strip + baseline caption. The stat row is the only place WPM
 *  paints ember — same single-accent rule as the caret above. Hairline
 *  dividers between stats, no card chrome, values flush-bottom so the
 *  numbers form one tabular row that reads as a live readout, not a
 *  table. Caption row anchors the brand URL + product one-liner. */
function Footer() {
  return (
    <div className="flex flex-col gap-7 border-t border-ft-ink-line px-14 pt-9 pb-8">
      <div className="grid grid-cols-4">
        <StatCell label="WPM" value="124" accent />
        <StatCell label="ACC" value="98%" />
        <StatCell label="BURST" value="148" />
        <StatCell label="WORD" value="32/50" />
      </div>
      <div className="flex items-center justify-between border-t border-ft-ink-line pt-6">
        <span
          className="font-semibold uppercase text-ft-paper"
          style={{ fontSize: 13, letterSpacing: "0.22em" }}
        >
          flinttype.app
        </span>
        <span
          className="font-medium uppercase text-ft-warm-3"
          style={{ fontSize: 11, letterSpacing: "0.28em" }}
        >
          Learns the bigrams you keep missing
        </span>
      </div>
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
    <div className="flex flex-col items-start gap-3 border-l border-ft-ink-line pl-6 first:border-l-0 first:pl-0">
      <span
        className="font-semibold uppercase text-ft-warm-3"
        style={{ fontSize: 11, letterSpacing: "0.28em" }}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${accent ? "text-ft-ember" : "text-ft-warm-1"}`}
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
