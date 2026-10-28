import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { EditorialList } from "../../_components/editorial-page";
import { type ChangelogRelease, previewReleases } from "./changelog-days";
import { parseInlineMarkdown } from "./inline-markdown";

/** One day's releases: the newest ones open, each under a small version
 *  sub-head, and the rest folded behind a "Show N more changes" row so a
 *  busy release day never turns into a wall of bullets. */
export function DayReleases({ releases }: { releases: ChangelogRelease[] }) {
  const { shown, rest, restCount } = previewReleases(releases, 8);
  return (
    <>
      <ReleaseList releases={shown} />
      {rest.length > 0 ? (
        <Fold
          summary={`Show ${restCount} more ${restCount === 1 ? "change" : "changes"} from this day`}
        >
          <ReleaseList releases={rest} />
        </Fold>
      ) : null}
    </>
  );
}

/** Releases stacked newest first, each a version sub-head over its
 *  bullet list. */
export function ReleaseList({ releases }: { releases: ChangelogRelease[] }) {
  return (
    <div className="flex flex-col gap-5">
      {releases.map((release) => (
        <div key={release.version} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tabular-nums tracking-wide text-muted-foreground">
            v{release.version}
          </h3>
          <ChangeLines lines={release.lines} />
        </div>
      ))}
    </div>
  );
}

/** A plain bullet list of changelog lines, with their inline markdown
 *  rendered. */
export function ChangeLines({ lines }: { lines: string[] }) {
  return (
    <EditorialList>
      {lines.map((line) => (
        <li key={line}>
          <InlineText line={line} />
        </li>
      ))}
    </EditorialList>
  );
}

/** Renders the file's `**bold**` and `` `code` `` instead of printing
 *  the markers. */
function InlineText({ line }: { line: string }) {
  return (
    <>
      {parseInlineMarkdown(line).map((seg, i) =>
        seg.kind === "strong" ? (
          <strong key={i} className="font-semibold text-foreground">
            {seg.text}
          </strong>
        ) : seg.kind === "code" ? (
          <code
            key={i}
            className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
          >
            {seg.text}
          </code>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** The changelog's one disclosure style: a rounded card whose 48px
 *  summary row carries a label and a rotating chevron. Used for the
 *  "more changes" fold and for each month of the archive. */
export function Fold({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-card text-card-foreground shadow-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-8 border-t border-border px-5 pt-5 pb-6 text-[15px] leading-7 text-foreground/85 sm:text-base">
        {children}
      </div>
    </details>
  );
}
