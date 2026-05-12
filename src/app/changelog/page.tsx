import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { EditorialPage, EditorialSection } from "../_components/editorial-page";

export const metadata = buildPageMetadata({
  title: "Changelog — what's new on flinttype",
  description:
    "Release notes for flinttype. Tracks user-visible features, fixes, and material changes to the privacy / terms policies. Pulled from VERSION + conventional commits.",
  path: "/changelog",
});

/** Curated changelog — written by hand from notable commits. Not
 *  auto-generated; the conventional-commits log is the raw source
 *  but we summarise to a user-facing line that fits a release note.
 *  Add an entry on every minor/major bump; patches that are pure
 *  internal refactors don't appear here. */
const ENTRIES: readonly {
  version: string;
  date: string;
  changes: readonly { kind: "feat" | "fix" | "chore"; line: string }[];
}[] = [
  {
    version: "6.8.0",
    date: "12 May 2026",
    changes: [
      { kind: "feat", line: "Leaderboard rebuilt with a sidebar filter rail, full-width table, and a simpler ranked layout." },
      { kind: "feat", line: "Editorial /blog, /changelog, and /faq pages launched alongside /privacy and /terms." },
      { kind: "chore", line: "sitemap and llms.txt updated to cover every public surface." },
    ],
  },
  {
    version: "6.7.0",
    date: "12 May 2026",
    changes: [
      { kind: "feat", line: "Editorial /privacy and /terms pages with a shared shell + section primitive." },
    ],
  },
  {
    version: "6.6.0",
    date: "11 May 2026",
    changes: [
      { kind: "feat", line: "/leaderboard backend wired to Neon — global net-WPM ranking with mode + window filters." },
      { kind: "feat", line: "Homepage JSON-LD + /about editorial page for long-tail SEO." },
      { kind: "feat", line: "Top bar redesigned — calmer nav, consolidated lineup panel, race podium." },
    ],
  },
  {
    version: "6.5.0",
    date: "10 May 2026",
    changes: [
      { kind: "feat", line: "Multiplayer race surface — friendly-slug challenge links, real-time progress, deterministic bot fillers." },
      { kind: "feat", line: "Persisted race runs tagged `mode=\"race\"` so they roll into history and the adaptive model." },
      { kind: "fix", line: "Race rooms stay alive across React strict-mode remounts." },
    ],
  },
  {
    version: "6.0.0",
    date: "May 2026",
    changes: [
      { kind: "feat", line: "Full /customise surface — palette, mode, geometry, caret, typography, keyboard, background, live stats, typing area, result, keymap." },
      { kind: "feat", line: "Mobile-first audit pass across every surface — settings use a fixed-height bottom sheet for pickers." },
      { kind: "feat", line: "Insights + drills pages with per-bigram weakness ranking, WPM trend, and targeted drill bento." },
    ],
  },
];

const KIND_LABEL: Record<"feat" | "fix" | "chore", string> = {
  feat: "New",
  fix: "Fix",
  chore: "Chore",
};

export default function ChangelogPage() {
  return (
    <AppChrome>
      <EditorialPage
        eyebrow="Releases"
        title="Changelog."
        subtitle="What changed, when. New features, fixes, and policy updates. Per-commit detail lives on GitHub; this is the curated user-facing summary."
      >
        {ENTRIES.map((e) => (
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
              {e.changes.map((c, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-baseline gap-3"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {KIND_LABEL[c.kind]}
                  </span>
                  <span className="text-[14px] leading-relaxed text-foreground/85">
                    {c.line}
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
