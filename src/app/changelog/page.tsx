import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChangelog } from "@/lib/changelog";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage, EditorialSection } from "../_components/editorial-page";

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
        subtitle="What changed, when — in plain language. Per-commit detail lives on GitHub; this is the curated user-facing summary."
      >
        {entries.map((e) => (
          <EditorialSection key={e.version}>
            <header className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 className="text-[18px] font-semibold tracking-tight text-foreground sm:text-[20px]">
                {e.version}
              </h2>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {e.date}
              </span>
            </header>
            <ul className="flex flex-col gap-2 pt-2">
              {e.lines.map((line, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span
                    aria-hidden
                    className="mt-[0.5em] size-1 shrink-0 rounded-[1px] bg-primary/60"
                  />
                  <span className="text-[14px] leading-relaxed text-foreground/85">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </EditorialSection>
        ))}
      </EditorialPage>
    </AppChrome>
  );
}
