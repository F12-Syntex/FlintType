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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ft-paper-soft px-4 py-10">
      {/* Wide, landscape promo — sized to paste into Discord, where wide
       *  images render large. Condensed + visual: a headline and a single
       *  row of preview thumbnails, no per-feature prose. */}
      <article className="w-full max-w-4xl rounded-lg border border-ft-line-soft bg-ft-paper p-6 text-ft-ink sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <span className="rounded-full border border-ft-ember/30 bg-ft-ember/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ft-ember">
            v{update.version} · {update.date}
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-extrabold leading-[0.95] tracking-[-0.02em] text-ft-ink sm:mt-6 sm:text-5xl">
          {update.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ft-dim-2 sm:text-lg">
          {update.tagline}
        </p>

        {/* Preview thumbnails — a single wide row on sm+, wrapping on
         *  mobile. Column count tracks the highlight count so a 3-up card
         *  doesn't leave a dead cell. */}
        <div
          className={`mt-6 grid grid-cols-2 gap-3 sm:mt-7 ${
            update.highlights.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
          }`}
        >
          {update.highlights.map((h) => {
            const Preview = UPDATE_PREVIEWS[h.preview];
            return (
              <div key={h.label} className="flex flex-col gap-2">
                <div className="flex h-24 items-center justify-center rounded-md border border-ft-line-soft bg-ft-paper-2 px-3">
                  {Preview ? <Preview /> : null}
                </div>
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-ft-dim">
                  {h.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-ft-line-soft pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ft-dim">
          <span className="text-ft-ink">flinttype</span>
          <span>Type faster, together</span>
        </div>
      </article>

      <Link
        href="/changelog"
        className="text-[11px] font-medium uppercase tracking-[0.14em] text-ft-dim transition-colors hover:text-ft-ink"
      >
        Back to changelog
      </Link>
    </div>
  );
}
