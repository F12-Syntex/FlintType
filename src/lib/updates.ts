/**
 * Update cards — a curated showcase per major release, rendered at the
 * private route `/updates/<slug>` and linked from the matching changelog
 * entries. The changelog (public/CHANGELOG.md) stays the exhaustive
 * per-version log; an Update is the editorial "here's the headline" card
 * for a release worth showing off.
 */
export type UpdateHighlight = { title: string; body: string };

export type Update = {
  /** URL slug — `/updates/<slug>`. */
  slug: string;
  /** Release series label shown as the eyebrow (e.g. "6.96"). */
  version: string;
  /** Feature name / headline. */
  title: string;
  /** One-line setup under the title. */
  tagline: string;
  /** Human date label. */
  date: string;
  /** Changelog versions this card covers — the /changelog page renders a
   *  "Read the update" link on each of these entries. */
  versions: string[];
  highlights: UpdateHighlight[];
  /** When true, the card renders the skill-radar showcase visual. */
  showcaseSkillRadar?: boolean;
};

export const UPDATES: Update[] = [
  {
    slug: "friends-and-profile",
    version: "6.96",
    title: "Friends & Profile",
    tagline: "A calmer place to find people, and a profile worth sharing.",
    date: "May 2026",
    versions: ["6.96.0", "6.94.0"],
    showcaseSkillRadar: true,
    highlights: [
      {
        title: "A redesigned friends hub",
        body: "One calm column: who's live right now, the duel challenges waiting for you inline, and a friends-first people switch. The noisy activity feed moved to the notifications bell.",
      },
      {
        title: "See what friends are up to",
        body: "Each person shows whether they're online, practising, or in a race right now, or when they were last active. Watch a friend's run live in a click.",
      },
      {
        title: "A profile built to share",
        body: "A cleaner header with your stats given room to breathe, a bigger experience bar, and a flame rank you choose, from Ember all the way to Solar Flare.",
      },
      {
        title: "Your skill at a glance",
        body: "A four-spoke skill chart, Speed, Accuracy, Consistency, and Endurance, drawn against the average typist so the shape actually means something.",
      },
    ],
  },
];

export function getUpdate(slug: string): Update | undefined {
  return UPDATES.find((u) => u.slug === slug);
}

/** The update card a given changelog version links to, if any. */
export function updateForVersion(version: string): Update | undefined {
  return UPDATES.find((u) => u.versions.includes(version));
}
