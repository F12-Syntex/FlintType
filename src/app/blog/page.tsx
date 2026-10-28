import Link from "next/link";
import { GITHUB_URL } from "@/lib/version";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialPage,
  EditorialSection,
} from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Blog — notes from the flinttype team",
  description:
    "Articles on touch typing, adaptive practice, the science of motor learning, and engineering notes from building flinttype. Updated as we ship.",
  path: "/blog",
});

/** Static blog index. POSTS is the source of truth — add an entry
 *  here, then create `/blog/<slug>/page.tsx` with the matching
 *  metadata. Kept inline (not a CMS) until the post count justifies
 *  one; small, readable, no build-time complexity. */
const POSTS: readonly {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}[] = [
  {
    slug: "why-adaptive-drills-work",
    title: "Why adaptive drills work (and random ones don't)",
    excerpt:
      "Motor learning research has a clear answer on how to get faster: practice the things you're slowest at, not the things you're already good at. Here's how flinttype puts that into code.",
    publishedAt: "Coming soon",
  },
  {
    slug: "net-wpm-vs-raw-wpm",
    title: "Net WPM vs raw WPM: what each one really tells you",
    excerpt:
      "The leaderboard ranks by net WPM (raw × accuracy). Why we picked that over raw, and what each number is honestly measuring.",
    publishedAt: "Coming soon",
  },
  {
    slug: "building-the-race-engine",
    title: "Building the race engine: friendly links, fixed countdowns and bots",
    excerpt:
      "How the live races work behind the scenes: short shareable lobby links, bots that fill empty seats, and a countdown that keeps every racer in sync.",
    publishedAt: "Coming soon",
  },
];

export default function BlogIndexPage() {
  // Only posts with a real page get linked; "Coming soon" entries have
  // no `/blog/<slug>/page.tsx` yet, and /blog is crawlable, so they are
  // listed as plain upcoming titles instead of dead links (#45 / FT-010).
  const published = POSTS.filter((p) => p.publishedAt !== "Coming soon");
  const upcoming = POSTS.filter((p) => p.publishedAt === "Coming soon");

  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Writing"
        title="Blog"
        subtitle="Notes on typing, adaptive practice and the engineering behind flinttype."
      >
        {published.length > 0 ? (
          <EditorialSection title="Posts">
            <ul className="flex flex-col gap-6">
              {published.map((p) => (
                <li key={p.slug}>
                  <article className="flex flex-col gap-1.5">
                    <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                      <Link
                        href={`/blog/${p.slug}`}
                        className="transition-colors hover:text-primary"
                      >
                        {p.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-muted-foreground">{p.publishedAt}</p>
                    <p>{p.excerpt}</p>
                  </article>
                </li>
              ))}
            </ul>
          </EditorialSection>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-8 text-center sm:px-8">
            <p className="text-[15px] leading-7 text-foreground/85 sm:text-base">
              No posts yet. Watch the project on{" "}
              <EditorialLink href={GITHUB_URL}>GitHub</EditorialLink> to hear
              when the first one lands.
            </p>
          </div>
        )}

        {upcoming.length > 0 ? (
          <EditorialSection title="Coming up">
            <ul className="flex flex-col gap-5">
              {upcoming.map((p) => (
                <li key={p.slug} className="flex flex-col gap-1">
                  <span className="font-medium text-foreground/70">{p.title}</span>
                  <span className="text-sm leading-6 text-muted-foreground">
                    {p.excerpt}
                  </span>
                </li>
              ))}
            </ul>
          </EditorialSection>
        ) : null}
      </EditorialPage>
    </AppChrome>
  );
}
