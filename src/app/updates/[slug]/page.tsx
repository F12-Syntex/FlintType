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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ft-paper-soft px-4 py-12">
      <article className="w-full max-w-xl overflow-hidden rounded-lg border border-ft-line-soft bg-ft-paper text-ft-ink">
        {/* Brand + version */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
          <Logo />
          <span className="rounded-full border border-ft-ember/30 bg-ft-ember/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ft-ember">
            v{update.version}
          </span>
        </div>

        {/* Headline */}
        <div className="px-6 pt-7 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ft-dim">
            What&apos;s new · {update.date}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] text-ft-ink sm:text-5xl">
            {update.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ft-dim-2 sm:text-base">
            {update.tagline}
          </p>
        </div>

        {/* Feature grid — each cell a bespoke mini-mockup preview, not an
         *  icon, framed like a little screenshot. */}
        <div className="mt-7 grid grid-cols-1 gap-px border-t border-ft-line-soft bg-ft-line-soft sm:grid-cols-2">
          {update.highlights.map((h) => {
            const Preview = UPDATE_PREVIEWS[h.preview];
            return (
              <div
                key={h.title}
                className="flex flex-col gap-3 bg-ft-paper p-5 sm:p-6"
              >
                <div className="flex h-28 items-center justify-center rounded-md border border-ft-line-soft bg-ft-paper-2 px-3">
                  {Preview ? <Preview /> : null}
                </div>
                <h2 className="text-[15px] font-bold tracking-tight text-ft-ink">
                  {h.title}
                </h2>
                <p className="text-[13px] leading-snug text-ft-dim-2">
                  {h.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer brand strip */}
        <div className="flex items-center justify-between gap-3 border-t border-ft-line-soft px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-ft-dim sm:px-8">
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
