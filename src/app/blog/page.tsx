import Link from "next/link";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage, EditorialSection } from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Blog — notes from the flinttype team",
  description:
    "Articles on touch typing, adaptive practice, the science of motor learning, and engineering notes from building flinttype. Updated as we ship.",
  path: "/blog",
});

/** Static blog index. POSTS is the source of truth — add an entry
 *  here, then create `/blog/<slug>/page.tsx` with the matching
 *  metadata and flip `published: true`. Until a post page ships it stays
 *  `published: false` and renders as plain text (no link) so the index
 *  never points at a 404. Kept inline (not a CMS) until the post count
 *  justifies one; small, readable, no build-time complexity. */
const POSTS: readonly {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  published: boolean;
}[] = [
  {
    slug: "why-adaptive-drills-work",
    title: "Why adaptive drills work (and random ones don't)",
    excerpt:
      "Motor learning research has a clear answer on how to get faster: practice the things you're slowest at, not the things you're already good at. Here's how flinttype puts that into code.",
    publishedAt: "Coming soon",
    published: false,
  },
  {
    slug: "net-wpm-vs-raw-wpm",
    title: "Net WPM vs raw WPM — what each one really tells you",
    excerpt:
      "The leaderboard ranks by net WPM (raw × accuracy). Why we picked that over raw, and what each number is honestly measuring.",
    publishedAt: "Coming soon",
    published: false,
  },
  {
    slug: "building-the-race-engine",
    title: "Building the race engine — friendly slugs, fixed countdowns, bot fillers",
    excerpt:
      "An engineering write-up on the multiplayer race surface: friendly-slug challenge links, deterministic bots, the fixed three-second countdown, and how we keep rooms alive across React strict-mode remounts.",
    publishedAt: "Coming soon",
    published: false,
  },
];

export default function BlogIndexPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Writing"
        title="Blog."
        subtitle="Notes on typing, adaptive practice, and the engineering behind flinttype. New entries land as we ship."
      >
        <EditorialSection>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {POSTS.map((p) => (
              <li key={p.slug} className="py-5 sm:py-6">
                <article className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[18px] font-semibold tracking-tight text-foreground sm:text-[20px]">
                      {p.published ? (
                        <Link
                          href={`/blog/${p.slug}`}
                          className="transition-colors hover:text-primary"
                        >
                          {p.title}
                        </Link>
                      ) : (
                        p.title
                      )}
                    </h2>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {p.publishedAt}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-foreground/85">
                    {p.excerpt}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </EditorialSection>

        <EditorialSection title="Subscribe">
          <p>
            There's no RSS feed yet. Star or watch the repo on GitHub
            to get notified when new posts ship — they go in
            alongside the release that motivated them.
          </p>
        </EditorialSection>
      </EditorialPage>
    </AppChrome>
  );
}
