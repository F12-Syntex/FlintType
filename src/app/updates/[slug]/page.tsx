import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ft";
import { getUpdate } from "@/lib/updates";
import { buildPageMetadata } from "@/server/seo";
import { UPDATE_PREVIEWS } from "../_components/previews";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update)
    return buildPageMetadata({ title: "Update", path: `/updates/${slug}`, noIndex: true });
  return buildPageMetadata({
    title: `${update.title} — flinttype ${update.version}`,
    description: update.tagline,
    path: `/updates/${slug}`,
    // Private showcase pages stay out of search + sitemap + llms.txt (S8).
    noIndex: true,
  });
}

/** A light, icon-led advert card for a release — built to screenshot and
 *  share, not to read like a changelog. Forced light via the fixed `ft-*`
 *  paper-and-ink tokens (§2.3) so it renders the same in dark mode, and
 *  no `<AppChrome>` so the page IS the card. */
export default async function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) notFound();

  const count = update.highlights.length;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ft-paper-soft px-4 py-10">
      {/* Hairlines here are rings / 1px fills, not borders, so the
       *  global Borders setting (which recolours every border) can't
       *  wash them out on this fixed-light asset in dark mode. */}
      {/* Wide, landscape promo — sized to paste into Discord, where wide
       *  images render large. Condensed + visual: a headline and a single
       *  row of preview thumbnails, no per-feature prose. */}
      <article className="relative isolate w-full max-w-4xl overflow-hidden rounded-2xl bg-ft-paper p-6 ring-1 ring-ft-line-soft text-ft-ink sm:p-9">
        {/* The logo's warmth: a soft static ember wash in the corner. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-ft-ember/15 blur-3xl"
        />
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <span className="inline-flex h-7 items-center rounded-full bg-ft-ember/12 px-3 text-xs font-semibold tabular-nums text-ft-ember">
            v{update.version} · {update.date}
          </span>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold leading-[0.95] tracking-[-0.03em] text-ft-ink sm:mt-8 sm:text-5xl">
          {update.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ft-dim-2 sm:text-lg">
          {update.tagline}
        </p>

        {/* Preview thumbnails — a single wide row on sm+, two-up on
         *  mobile. Column count tracks the highlight count so a 3-up card
         *  doesn't leave a dead cell, and an odd last tile spans the
         *  mobile row instead of leaving a hole. */}
        <div
          className={`mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 ${
            count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
          }`}
        >
          {update.highlights.map((h, i) => {
            const Preview = UPDATE_PREVIEWS[h.preview];
            const spanRow = count % 2 === 1 && i === count - 1;
            return (
              <div
                key={h.label}
                className={`flex flex-col gap-2.5 ${spanRow ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl bg-ft-paper-2 px-3 ring-1 ring-inset ring-ft-line-soft">
                  {Preview ? <Preview /> : null}
                </div>
                <p className="text-center text-sm font-semibold text-ft-ink">
                  {h.label}
                </p>
              </div>
            );
          })}
        </div>

        <div aria-hidden className="mt-7 h-px bg-ft-line-soft sm:mt-8" />
        <div className="flex items-center justify-between gap-3 pt-5 text-sm">
          <span className="font-semibold text-ft-ink">flinttype.com</span>
          <span className="text-ft-dim-2">Type faster, together</span>
        </div>
      </article>

      <Link
        href="/changelog"
        className="inline-flex h-11 items-center rounded-pill px-4 text-sm font-medium text-ft-dim-2 transition-colors hover:bg-ft-paper-2 hover:text-ft-ink"
      >
        Back to changelog
      </Link>
    </div>
  );
}
