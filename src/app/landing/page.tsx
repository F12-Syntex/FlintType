import { Logo, Kbd } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "flinttype — a typing speed test, set in ink",
  description:
    "flinttype is an open-source typing speed test: adaptive practice that drills your weakest keys, real-time races, and customisation to the studs.",
  path: "/landing",
  // Cover / social asset, not an indexed route. noIndex keeps it out of
  // search, the sitemap, and llms.txt (SEO S8).
  noIndex: true,
});

/**
 * Cover image for the program — a single, self-contained editorial masthead
 * built to be screenshotted. Forced light via the fixed `ft-*` paper-and-ink
 * tokens (ui-law §2.3 / §19) so it renders identically regardless of the
 * viewer's theme or mode, and no `<AppChrome>` so the page IS the cover.
 * Server Component, zero motion: a frozen screenshot must always read, so the
 * carets are solid (never mid-blink).
 */
export default function LandingCover() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ft-paper text-ft-ink">
      {/* Printed-page margin rule — purely decorative containment. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 rounded-lg border border-ft-line-soft sm:inset-5"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-6 py-7 sm:px-12 sm:py-10">
        {/* Running header */}
        <header className="flex items-center justify-between gap-3 border-b border-ft-line-soft pb-5">
          <Logo />
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ft-dim">
            open source · MIT
          </span>
        </header>

      {/* Masthead + product strip, grouped and centred as one block so the
          page reads as a composed sheet, not top-and-bottom clusters. */}
      <div className="flex flex-1 flex-col justify-center gap-8 py-6 sm:gap-12 sm:py-9">
        {/* Masthead — left-aligned, asymmetric, the wordmark dominates */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.7fr_1fr] lg:gap-14">
          <div className="flex flex-col">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.32em] text-ft-dim">
              <span className="mr-2 inline-block h-2 w-2 translate-y-px bg-ft-ember align-middle" />
              Typing speed test
            </p>

            <h1 className="font-extrabold leading-[0.86] tracking-[-0.045em] text-ft-ink">
              <span className="text-6xl sm:text-8xl lg:text-[118px]">
                flinttype
              </span>
              {/* The single dominant spark: a solid coral caret, on the line
                  as if the name is being typed. */}
              <span
                aria-hidden
                className="ml-1.5 inline-block h-[0.92em] w-[0.14em] translate-y-[0.06em] bg-ft-ember sm:ml-2.5"
              />
            </h1>

            <p className="mt-6 max-w-[34ch] text-xl font-medium leading-snug text-ft-ink sm:text-2xl">
              A typing speed test, set in ink.
            </p>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-ft-dim-2 sm:text-base">
              Adaptive practice that drills your weakest keys, real-time races
              against friends and bots, and customisation to the studs.
            </p>
          </div>

          {/* Spec ledger — datasheet detail, hairline-divided, right-weighted */}
          <dl className="divide-y divide-ft-line-soft border-y border-ft-line-soft lg:justify-self-end">
            {[
              { k: "Modes", v: "words · time · quote · burst" },
              { k: "Adaptive", v: "drills your weak keys" },
              { k: "Multiplayer", v: "8-player live races" },
              { k: "Themes", v: "24 + full custom" },
            ].map((row) => (
              <div
                key={row.k}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ft-dim">
                  {row.k}
                </dt>
                <dd className="text-right text-[13px] font-medium text-ft-ink">
                  {row.v}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Product strip — a faithful frozen practice surface so the cover
            shows the real thing, not an abstraction. */}
        <section className="rounded-md border border-ft-line-soft bg-ft-paper-soft px-5 py-5 sm:px-7 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ft-dim">
              words · 50
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-ft-dim sm:inline">
              press any key to begin
            </span>
          </div>

          {/* Passage: typed (ink) → caret → untyped (dim), with one errored
              word in coral, matching the real passage tokens (ui-law §4). */}
          <p className="text-xl leading-[1.65] tracking-tight sm:text-[26px]">
            <span className="text-ft-ink">the quick </span>
            <span className="text-ft-ember underline decoration-ft-ember decoration-1 underline-offset-[6px]">
              brown
            </span>
            <span className="text-ft-ink"> fox jumps over the</span>
            {/* solid coral caret on the next character */}
            <span
              aria-hidden
              className="mx-0.5 inline-block h-[0.95em] w-[0.12em] translate-y-[0.16em] bg-ft-ember"
            />
            <span className="text-ft-dim"> lazy dog while a steady rhythm keeps the pace</span>
          </p>

          {/* Readouts — tabular, organic numbers, ink (the caret is the spark) */}
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-ft-line-soft pt-4">
            <Readout label="wpm" value="124" />
            <Readout label="acc" value="98.7" suffix="%" />
            <Readout label="peak" value="161" />
            <Readout label="consistency" value="92" suffix="%" />
            <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-ft-dim sm:flex">
              <Kbd>esc</Kbd> restart
              <span className="mx-1 text-ft-line-soft">·</span>
              <Kbd>tab</Kbd> new test
            </span>
          </div>
        </section>
      </div>

        {/* Footer rule */}
        <footer className="flex items-center justify-between gap-3 border-t border-ft-line-soft pt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-ft-dim">
          <span className="text-ft-ink">flinttype.com</span>
          <span className="hidden sm:inline">Next.js · React · TypeScript</span>
          <span>Type faster, together</span>
        </footer>
      </div>
    </main>
  );
}

function Readout({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ft-dim">
        {label}
      </span>
      <span className="text-3xl font-bold tracking-[-0.03em] tabular-nums text-ft-ink sm:text-[34px]">
        {value}
        {suffix ? (
          <span className="text-base font-medium text-ft-dim">{suffix}</span>
        ) : null}
      </span>
    </div>
  );
}
