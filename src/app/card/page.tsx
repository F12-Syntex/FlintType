import type { Metadata } from "next";
import { getAppVersion } from "@/server/version";
import { buildPageMetadata } from "@/server/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Card",
  description: "Screenshot-ready social card for flinttype.",
  path: "/card",
  noIndex: true,
});

/** A 1200 × 630 (Twitter / OG aspect 1.91 : 1) brand card. Renders at a
 *  fixed pixel size so a screenshot tool — Vercel OG, Puppeteer, manual
 *  Cmd-Shift-4 — produces an asset usable as og:image / twitter:image
 *  without further cropping. The card paints from the *fixed*
 *  paper-and-ink palette (`ft-*` tokens) rather than the user's chosen
 *  theme so every capture looks the same regardless of the viewer's
 *  current mode / palette — the card is brand-stable by design. */
export default function CardPage() {
  const version = getAppVersion();
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-200 p-6 dark:bg-zinc-900">
      <Card version={version} />
    </main>
  );
}

function Card({ version }: { version: string }) {
  return (
    <div
      // data-screenshot-target — automation can locate the card without
      // grabbing the surrounding page chrome.
      data-screenshot-target="og-card"
      style={{ width: 1200, height: 630 }}
      className="relative grid shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-ft-paper text-ft-ink shadow-2xl shadow-black/20 ring-1 ring-ft-line-soft"
    >
      <Header version={version} />
      <Passage />
      <Footer />
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────── */

function Header({ version }: { version: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ft-line-soft px-14 py-9">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-12 w-auto"
        />
        <span
          className="text-[34px] font-extrabold tracking-tight"
          style={{ letterSpacing: "-0.04em" }}
        >
          flinttype
        </span>
        <span className="ml-3 text-[12px] font-medium uppercase tracking-[0.22em] text-ft-dim">
          v{version}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span aria-hidden className="block size-2 bg-ft-ember" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-ft-ink">
          Open source typing test
        </span>
      </div>
    </div>
  );
}

/* ─── Passage ──────────────────────────────────────────────────── */

/** The hero passage. The wordmark of the brand is the typing surface
 *  itself, so the card foregrounds it: typed letters in primary
 *  (ember), an inline live caret, untyped letters in muted ink, one
 *  error word underlined. Sized large so the headline reads at
 *  thumbnail size (where most OG impressions happen). */
function Passage() {
  return (
    <div className="flex flex-col justify-center px-14 py-6">
      <p
        className="font-mono leading-[1.22]"
        style={{
          fontSize: 56,
          letterSpacing: "-0.015em",
          fontWeight: 500,
        }}
      >
        <span className="text-ft-ember">the&nbsp;quick&nbsp;brown&nbsp;fox</span>
        <span className="text-ft-dim-2">&nbsp;jumps&nbsp;over&nbsp;the&nbsp;</span>
        <span
          className="text-ft-ember"
          style={{
            textDecoration: "underline",
            textDecorationColor: "#E1582C",
            textDecorationThickness: 3,
            textUnderlineOffset: 8,
          }}
        >
          lazy
        </span>
        <span className="text-ft-dim-2">&nbsp;dog,&nbsp;hot&nbsp;cof</span>
        <CaretInline />
        <span className="text-ft-dim-2">fee&nbsp;in&nbsp;hand.</span>
      </p>
    </div>
  );
}

/** Static caret bar — inline element so it sits between letters like
 *  the real practice caret. */
function CaretInline() {
  return (
    <span
      aria-hidden
      className="inline-block bg-ft-ember align-baseline"
      style={{
        width: 4,
        height: 56,
        marginLeft: -2,
        marginRight: -2,
        transform: "translateY(10px)",
      }}
    />
  );
}

/* ─── Footer ───────────────────────────────────────────────────── */

function Footer() {
  return (
    <div className="flex items-end justify-between border-t border-ft-line-soft px-14 py-9">
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-ft-dim">
          Practice · Drills · Races
        </span>
        <span
          className="text-[24px] font-semibold tracking-tight text-ft-ink"
          style={{ letterSpacing: "-0.02em" }}
        >
          A typing test for people who type a lot.
        </span>
      </div>
      <div className="flex items-end gap-8 text-right">
        <StatBlock label="WPM" value="124" />
        <StatBlock label="ACC" value="98%" />
        <div className="flex flex-col items-end gap-2 pl-4">
          <span className="text-[12px] font-medium uppercase tracking-[0.22em] text-ft-dim">
            flinttype.app
          </span>
          <span className="text-[12px] uppercase tracking-[0.22em] text-ft-ember">
            ⌘ press F to focus
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className="font-mono tabular-nums text-ft-ink"
        style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em" }}
      >
        {value}
      </span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-ft-dim">
        {label}
      </span>
    </div>
  );
}
