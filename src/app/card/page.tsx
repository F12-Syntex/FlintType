import type { Metadata } from "next";
import { buildPageMetadata } from "@/server/seo";
import { ScreenshotButton } from "./_components/screenshot-button";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card painted to
 *  read as a screenshot of a real flinttype run — dark warm-ink
 *  surface, real passage with typed / untyped letter states, ember
 *  caret mid-keystroke, live stat strip with WPM accented.
 *
 *  Painted from the fixed `ft-*` warm-ink ramp (docs/ui-law.md §2.3)
 *  so every screenshot looks identical regardless of viewer theme. */
export default function CardPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-zinc-200 p-6 dark:bg-zinc-900">
      <ScreenshotButton />
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

/** Slim app-shell top rail. Even vertical padding; logo + wordmark
 *  sized to share visual weight; right group flows on a single
 *  baseline with one consistent gap between every element. */
function Header() {
  return (
    <div className="flex items-center justify-between border-b border-ft-ink-line px-14 py-7">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-9 w-auto"
        />
        <span
          className="font-extrabold text-ft-paper"
          style={{ fontSize: 32, letterSpacing: "-0.045em", lineHeight: 1 }}
        >
          flinttype
        </span>
      </div>
      <div className="flex items-center gap-7">
        <span
          className="font-semibold uppercase text-ft-warm-3"
          style={{ fontSize: 12, letterSpacing: "0.22em", lineHeight: 1 }}
        >
          Words · 50
        </span>
        <span
          className="font-medium tabular-nums text-ft-warm-1"
          style={{ fontSize: 14, letterSpacing: "0.04em", lineHeight: 1 }}
        >
          0:34
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="block h-[7px] w-[7px] bg-ft-ember" />
          <span
            className="font-bold uppercase text-ft-ember"
            style={{ fontSize: 11, letterSpacing: "0.26em", lineHeight: 1 }}
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
 *  paper, ember caret mid-word, untyped suffix in warm-4. Line 3
 *  untyped (warm-4). The block uses `w-fit + mx-auto` so the longest
 *  line drives its width and the whole flush-left block centers
 *  honestly inside the card. */
function Passage() {
  const PASSAGE_PX = 56;
  const lineStyle = {
    fontSize: PASSAGE_PX,
    lineHeight: 1.36,
    letterSpacing: "-0.018em",
    fontWeight: 500,
    display: "block",
    whiteSpace: "nowrap" as const,
  } as const;
  return (
    <div className="flex flex-col justify-center px-20">
      <p className="mx-auto w-fit">
        <span style={lineStyle}>
          <span className="text-ft-paper">
            your hands learn the keys you keep
          </span>
        </span>
        <span style={lineStyle}>
          <span className="text-ft-paper">missing, the rhythm tigh</span>
          <Caret px={PASSAGE_PX} />
          <span className="text-ft-warm-4">tens, and</span>
        </span>
        <span style={lineStyle}>
          <span className="text-ft-warm-4">the slips quietly disappear.</span>
        </span>
      </p>
    </div>
  );
}

/** Thin ember bar sized to ~95% of the cap height, vertically centered
 *  on the typographic middle so it reads as the natural insertion
 *  point between two glyphs. No transform hacks — `vertical-align:
 *  middle` lets the bar sit on the same midline as the surrounding
 *  letters across font sizes. */
function Caret({ px }: { px: number }) {
  return (
    <span
      aria-hidden
      className="inline-block bg-ft-ember"
      style={{
        width: 4,
        height: px * 0.78,
        verticalAlign: "-0.18em",
        marginInline: 2,
      }}
    />
  );
}

/* ─── Footer ────────────────────────────────────────────────────── */

/** Stat strip + baseline caption. Four equal columns drive the
 *  rhythm — no internal dividers (they forced the first cell to be
 *  flush-left while the others sat inset, breaking column alignment).
 *  WPM is the only ember in this band, matching the caret above.
 *  Caption row sits below a single hairline; URL anchors the left,
 *  product line anchors the right, both sharing the footer's left/right
 *  padding so they align with the stat columns above. */
function Footer() {
  return (
    <div className="flex flex-col gap-8 border-t border-ft-ink-line px-14 pt-9 pb-9">
      <div className="grid grid-cols-4">
        <StatCell label="WPM" value="124" accent />
        <StatCell label="ACC" value="98%" />
        <StatCell label="BURST" value="148" />
        <StatCell label="WORD" value="32/50" />
      </div>
      <div className="flex items-center justify-between border-t border-ft-ink-line pt-7">
        <span
          className="font-semibold uppercase text-ft-paper"
          style={{ fontSize: 13, letterSpacing: "0.22em", lineHeight: 1 }}
        >
          flinttype.com
        </span>
        <span
          className="font-medium uppercase text-ft-warm-3"
          style={{ fontSize: 12, letterSpacing: "0.22em", lineHeight: 1 }}
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
    <div className="flex flex-col items-start gap-3">
      <span
        className="font-semibold uppercase text-ft-warm-3"
        style={{ fontSize: 11, letterSpacing: "0.28em", lineHeight: 1 }}
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
