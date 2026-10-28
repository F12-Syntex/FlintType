import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChangelog } from "@/lib/changelog";
import { updateForVersion } from "@/lib/updates";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import {
  EditorialLink,
  EditorialPage,
  EditorialSection,
} from "../_components/editorial-page";
import {
  type ChangelogDay,
  groupChangelogByDay,
  groupDaysByMonth,
  splitRecentDays,
  versionRangeLabel,
} from "./_components/changelog-days";
import { ChangeLines, DayReleases, Fold } from "./_components/release-list";

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
        subtitle="What changed and when, in plain language. The newest changes come first; behind-the-scenes work is left out."
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
                {versionRangeLabel(day.from, day.to)}
              </span>
            }
          >
            <DayReleases releases={day.releases} />
            <UpdateLink day={day} />
          </EditorialSection>
        ))}

        {months.length > 0 ? (
          <EditorialSection
            title={recent.length > 0 ? "Earlier releases" : "Releases"}
          >
            <div className="flex flex-col gap-3">
              {months.map((m) => (
                <Fold
                  key={m.month}
                  summary={
                    <span className="flex items-baseline gap-3">
                      <span className="text-base font-semibold tracking-tight text-foreground">
                        {m.month}
                      </span>
                      <span className="text-xs font-normal tabular-nums text-muted-foreground">
                        {m.days.length} {m.days.length === 1 ? "day" : "days"}
                      </span>
                    </span>
                  }
                >
                  {m.days.map((day) => (
                    <ArchiveDay key={day.date} day={day} />
                  ))}
                </Fold>
              ))}
            </div>
          </EditorialSection>
        ) : null}
      </EditorialPage>
    </AppChrome>
  );
}

/** One older day inside a month fold: the date, its version range and
 *  every user-facing line in one list (no per-release sub-heads, since
 *  the archive is for looking things up, not skimming). */
function ArchiveDay({ day }: { day: ChangelogDay }) {
  return (
    <div id={dayAnchor(day)} className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          <time dateTime={day.iso ?? undefined}>{day.date}</time>
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {versionRangeLabel(day.from, day.to)}
        </span>
      </div>
      <ChangeLines lines={day.releases.flatMap((r) => r.lines)} />
      <UpdateLink day={day} />
    </div>
  );
}

/** "Read the update: …" when one of the day's versions has an update
 *  card. */
function UpdateLink({ day }: { day: ChangelogDay }) {
  const update = day.versions
    .map((v) => updateForVersion(v))
    .find((u) => u != null);
  if (!update) return null;
  return (
    <p className="text-sm">
      <EditorialLink href={`/updates/${update.slug}`}>
        Read the update: {update.title}
      </EditorialLink>
    </p>
  );
}

function dayAnchor(day: ChangelogDay): string {
  return day.iso ? `d-${day.iso}` : `d-${day.date.toLowerCase().replace(/\s+/g, "-")}`;
}
