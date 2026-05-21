import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { parseChangelog } from "@/lib/changelog";
import { updateForVersion } from "@/lib/updates";
import { cn } from "@/lib/utils";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage } from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Changelog — what's new on flinttype",
  description:
    "Release notes for flinttype. Plain-language summary of every release — new features, fixes, and policy updates. The raw file is served at /changelog.md.",
  path: "/changelog",
});

/** Single source of truth: `public/CHANGELOG.md`, also served raw at
 *  `/changelog.md`. Read off disk and parsed at build time (this page
 *  is static), so the user-facing summary stays in lockstep with the
 *  file the commit protocol updates on every version bump — no second
 *  hand-curated list to drift. */
const CHANGELOG_PATH = join(process.cwd(), "public", "CHANGELOG.md");

export default function ChangelogPage() {
  const entries = parseChangelog(readFileSync(CHANGELOG_PATH, "utf8"));

  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Releases"
        title="Changelog."
        subtitle="What changed and when, in plain language. Per-commit detail lives on GitHub; this is the curated user-facing summary."
        footer={
          <>
            Prefer plain text? The raw changelog lives at{" "}
            <a
              href="/changelog.md"
              className="text-foreground underline-offset-4 hover:underline"
            >
              /changelog.md
            </a>
            .
          </>
        }
      >
        <div className="flex flex-col">
          {entries.map((entry, i) => {
            const update = updateForVersion(entry.version);
            return (
            <article
              key={entry.version}
              className="flex flex-col gap-3 border-t border-border/60 pt-7 pb-1 first:border-t-0 first:pt-0 md:grid md:grid-cols-[8rem_minmax(0,1fr)] md:gap-10 md:pt-9"
            >
              {/* Version + date rail — a justified row on mobile, a
                  sticky stacked column from md up so it stays beside a
                  long change list as the reader scrolls. The newest
                  release carries the single coral spark. */}
              <div className="md:sticky md:top-6 md:self-start">
                <div className="flex items-baseline justify-between gap-3 md:block">
                  <h2
                    className={cn(
                      "text-lg font-bold tracking-tight tabular-nums",
                      i === 0 ? "text-primary" : "text-foreground",
                    )}
                  >
                    {entry.version}
                  </h2>
                  <time className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] tabular-nums text-muted-foreground md:mt-2 md:block">
                    {entry.date}
                  </time>
                </div>
                {update ? (
                  <Link
                    href={`/updates/${update.slug}`}
                    className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    Read the update
                  </Link>
                ) : null}
              </div>

              <ul className="flex flex-col gap-2.5">
                {entry.lines.map((line, lineIndex) => (
                  <li key={lineIndex} className="flex items-baseline gap-3">
                    <span
                      aria-hidden
                      className="mt-[0.55em] size-1 shrink-0 rounded-[1px] bg-foreground/25"
                    />
                    <span className="text-[14px] leading-relaxed text-foreground/85">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
            );
          })}
        </div>
      </EditorialPage>
    </AppChrome>
  );
}
