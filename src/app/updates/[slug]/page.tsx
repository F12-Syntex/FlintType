import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SkillRadar } from "@/components/skill-radar";
import { SKILL_BASELINE } from "@/lib/skill-baseline";
import { getUpdate } from "@/lib/updates";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../_components/app-chrome";

/** Above-average sample shape for the showcase radar — illustrative, not
 *  a real user; it sits clearly outside the average baseline so the
 *  comparison reads at a glance. */
const DEMO_SKILLS = [
  { key: "speed", label: "Speed", value: 64 },
  { key: "accuracy", label: "Accuracy", value: 88 },
  { key: "consistency", label: "Consistency", value: 76 },
  { key: "endurance", label: "Endurance", value: 58 },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) return buildPageMetadata({ title: "Update", path: `/updates/${slug}`, noIndex: true });
  return buildPageMetadata({
    title: `${update.title} — flinttype ${update.version}`,
    description: update.tagline,
    path: `/updates/${slug}`,
    // Private showcase pages stay out of search + sitemap + llms.txt (SEO S8).
    noIndex: true,
  });
}

export default async function UpdatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const update = getUpdate(slug);
  if (!update) notFound();

  return (
    <AppChrome>
      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:py-16">
        <article className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex flex-col gap-3 border-b border-border/60 px-5 py-6 sm:px-8 sm:py-8">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span aria-hidden className="inline-block h-px w-4 bg-primary" />
              Update · v{update.version} · {update.date}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {update.title}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {update.tagline}
            </p>
          </header>

          {update.showcaseSkillRadar ? (
            <div className="border-b border-border/60 px-5 py-7 sm:px-8">
              <SkillRadar skills={DEMO_SKILLS} baseline={SKILL_BASELINE} />
            </div>
          ) : null}

          <ul className="flex flex-col divide-y divide-border/60">
            {update.highlights.map((h) => (
              <li
                key={h.title}
                className="flex flex-col gap-1.5 px-5 py-5 sm:px-8"
              >
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  {h.title}
                </h2>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {h.body}
                </p>
              </li>
            ))}
          </ul>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border/60 px-5 py-5 sm:px-8">
            <Link
              href="/friends"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Open friends
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Your profile
            </Link>
            <Link
              href="/changelog"
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Full changelog
            </Link>
          </footer>
        </article>
      </main>
    </AppChrome>
  );
}
