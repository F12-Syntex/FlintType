/**
 * Update cards — a curated showcase per major release, rendered at the
 * private route `/updates/<slug>` and linked from the matching changelog
 * entries. The changelog (public/CHANGELOG.md) stays the exhaustive
 * per-version log; an Update is the editorial "here's the headline" card
 * for a release worth showing off.
 */
import { Eye, Flame, Swords, Users, type LucideIcon } from "lucide-react";

export type UpdateHighlight = { icon: LucideIcon; title: string; body: string };

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
  /** Short, punchy, icon-led feature cards — advert copy, never
   *  technical (the card is a screenshot-able promo, not a changelog). */
  highlights: UpdateHighlight[];
};

export const UPDATES: Update[] = [
  {
    slug: "friends-and-profile",
    version: "6.96",
    title: "Friends & Profile",
    tagline: "Find your people. Show off your speed.",
    date: "May 2026",
    versions: ["6.96.0", "6.94.0"],
    highlights: [
      {
        icon: Users,
        title: "A calmer friends hub",
        body: "Everyone you type with, in one tidy place.",
      },
      {
        icon: Eye,
        title: "See who's around",
        body: "Online, practising, racing, or last seen, at a glance.",
      },
      {
        icon: Swords,
        title: "Duel your friends",
        body: "Challenges land right on the page. Tap to race.",
      },
      {
        icon: Flame,
        title: "A profile to show off",
        body: "Your skill shape, your stats, and a flame rank to claim.",
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
