import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ChevronDown } from "lucide-react";
import {
  type ChangelogDay,
  groupChangelogByDay,
  groupDaysByMonth,
  parseChangelog,
  splitRecentDays,
} from "@/lib/changelog";
import { updateForVersion } from "@/lib/updates";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialList,
  EditorialPage,
  EditorialSection,
} from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Changelog — what's new on flinttype",
  description:
    "Release notes for flinttype. Plain-language summary of every release — new features, fixes, and policy updates. The raw file is served at /changelog.md.",
  path: "/changelog",
});

/** Single source of truth: `public/CHANGELOG.md`, also served raw at
 *  `/changelog.md`. Read off disk and parsed at build time (this page
 *  is static), so the summary stays in lockstep with the file the
 *  commit protocol updates on every version bump. The page groups
 *  releases by day and drops internal-only lines; the raw file keeps
 *  every version. */
const CHANGELOG_PATH = join(process.cwd(), "public", "CHANGELOG.md");

export default function ChangelogPage() {
  const days = groupChangelogByDay(
    parseChangelog(readFileSync(CHANGELOG_PATH, "utf8")),
  );
  const { recent, older } = splitRecentDays(days, 30);
  const months = groupDaysByMonth(older);

  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Releases"
        title="Changelog"
        subtitle="What changed and when, in plain language, one day at a time. Behind-the-scenes work is left out."
        footer={
          <>
            Want every version, including internal ones? The full log is
            at <EditorialLink href="/changelog.md">/changelog.md</EditorialLink>.
          </>
        }
      >
        {recent.map((day, i) => (
          <EditorialSection
            key={day.date}
            id={dayAnchor(day)}
            title={<time dateTime={day.iso ?? undefined}>{day.date}</time>}
            meta={
              <span className="inline-flex items-center gap-2">
                {i === 0 ? (
                  <span className="inline-flex h-6 items-center rounded-pill bg-primary/10 px-2.5 text-xs font-semibold text-primary">
                    Latest
                  </span>
                ) : null}
                {versionLabel(day)}
              </span>
            }
          >
            <DayBody day={day} />
          </EditorialSection>
        ))}

        {months.length > 0 ? (
          <EditorialSection
            title={recent.length > 0 ? "Earlier releases" : "Releases"}
          >
            <div className="flex flex-col gap-3">
              {months.map((m) => (
                <details
                  key={m.month}
                  className="group rounded-2xl border border-border bg-card text-card-foreground shadow-card"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-baseline gap-3">
                      <span className="text-base font-semibold tracking-tight text-foreground">
                        {m.month}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {m.days.length} {m.days.length === 1 ? "day" : "days"}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <div className="flex flex-col gap-8 border-t border-border px-5 pt-5 pb-6">
                    {m.days.map((day) => (
                      <div
                        key={day.date}
                        id={dayAnchor(day)}
                        className="flex scroll-mt-24 flex-col gap-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="text-base font-semibold tracking-tight text-foreground">
                            <time dateTime={day.iso ?? undefined}>{day.date}</time>
                          </h3>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {versionLabel(day)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground/85">
                          <DayBody day={day} />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </EditorialSection>
        ) : null}
      </EditorialPage>
    </AppChrome>
  );
}

/** The merged bullet list for one day, plus a link to the update card
 *  when one of that day's versions has one. */
function DayBody({ day }: { day: ChangelogDay }) {
  const update = day.versions
    .map((v) => updateForVersion(v))
    .find((u) => u != null);
  return (
    <>
      <EditorialList>
        {day.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </EditorialList>
      {update ? (
        <p className="text-sm">
          <EditorialLink href={`/updates/${update.slug}`}>
            Read the update: {update.title}
          </EditorialLink>
        </p>
      ) : null}
    </>
  );
}

function versionLabel(day: ChangelogDay): string {
  return day.from === day.to ? `v${day.to}` : `v${day.from} to ${day.to}`;
}

function dayAnchor(day: ChangelogDay): string {
  return day.iso ? `d-${day.iso}` : `d-${day.date.toLowerCase().replace(/\s+/g, "-")}`;
}
