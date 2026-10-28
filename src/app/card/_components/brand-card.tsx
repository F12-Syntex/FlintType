/** A 1500 × 787 (Twitter / OG aspect 1.91 : 1) brand card painted to
 *  read as a screenshot of a real flinttype run — dark warm-ink
 *  surface, real passage with typed / untyped letter states, ember
 *  caret mid-keystroke, live stat strip with WPM accented.
 *
 *  Painted from the fixed `ft-*` warm-ink ramp (docs/ui-law.md §2.3)
 *  so every screenshot looks identical regardless of viewer theme. */

export const CARD_W = 1500;
export const CARD_H = 787;

export function BrandCard() {
  return (
    <div
      data-screenshot-target="og-card"
      style={{ width: CARD_W, height: CARD_H }}
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

/** A 1px rule painted as a fill, not a border: the card is a fixed
 *  asset, and the global Borders setting recolours every border in the
 *  app (it would wash these out). */
function Hairline({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-x-0 h-px bg-ft-ink-line ${className}`}
    />
  );
}

/* ─── Header rail ───────────────────────────────────────────────── */

/** Slim app-shell top rail. Even vertical padding; logo + wordmark
 *  sized to share visual weight; right group flows on a single
 *  baseline with one consistent gap between every element. */
function Header() {
  return (
    <div className="relative flex items-center justify-between px-14 py-7">
      <Hairline className="bottom-0" />
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-9 w-auto"
        />
        <span
          className="font-sans font-extrabold text-ft-paper"
          style={{ fontSize: 34, letterSpacing: "-0.04em", lineHeight: 1 }}
        >
          flinttype
        </span>
      </div>
      <div className="flex items-center gap-7">
        <span
          className="rounded-full bg-ft-ink-track px-4 py-2.5 font-sans font-semibold text-ft-warm-1 ring-1 ring-inset ring-ft-ink-line"
          style={{ fontSize: 15, lineHeight: 1 }}
        >
          Words · 50
        </span>
        <span
          className="font-medium tabular-nums text-ft-warm-1"
          style={{ fontSize: 16, letterSpacing: "0.02em", lineHeight: 1 }}
        >
          0:34
        </span>
        <span className="flex items-center gap-2 rounded-full bg-ft-ember/15 px-4 py-2.5">
          <span aria-hidden className="block size-2 rounded-full bg-ft-ember" />
          <span
            className="font-sans font-bold text-ft-ember"
            style={{ fontSize: 15, lineHeight: 1 }}
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
    <div className="relative flex flex-col gap-8 px-14 pt-9 pb-9">
      <Hairline className="top-0" />
      <div className="grid grid-cols-4">
        <StatCell label="wpm" value="124" accent />
        <StatCell label="accuracy" value="98%" />
        <StatCell label="burst" value="148" />
        <StatCell label="word" value="32/50" />
      </div>
      <div className="relative flex items-center justify-between pt-7">
        <Hairline className="top-0" />
        <span
          className="font-sans font-semibold text-ft-paper"
          style={{ fontSize: 17, lineHeight: 1 }}
        >
          flinttype.com
        </span>
        <span
          className="font-sans font-medium text-ft-warm-2"
          style={{ fontSize: 17, lineHeight: 1 }}
        >
          Learns the letter pairs you keep missing
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
        className="font-sans font-medium text-ft-warm-3"
        style={{ fontSize: 17, lineHeight: 1 }}
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
