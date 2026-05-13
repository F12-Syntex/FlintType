import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

/** Static drill catalogue — id → human title used for the page
 *  `<title>` and metadata description. Mirrors the catalog in
 *  `src/app/drills/_components/drills-data.ts`; if a new drill id
 *  ships there, add a matching row here. Unknown ids fall back to a
 *  generic title (the page itself will redirect to `not-found` for
 *  truly unknown ids, but the metadata still needs to resolve). */
const DRILL_TITLES: Record<
  string,
  { title: string; description: string }
> = {
  weakness: {
    title: "Weakness gauntlet drill",
    description:
      "Sudden-death drill on the bigrams the adapt model flags as your slowest. One mistake restarts the passage.",
  },
  "worst-words": {
    title: "Worst-words drill",
    description:
      "Burst-typing drill on the twenty words your adapt model rates slowest — clear each at threshold WPM to advance.",
  },
  "trigram-burst": {
    title: "Trigram burst drill",
    description:
      "Burst-typing drill on common English trigrams. Land each above the gate WPM to streak up.",
  },
  "burst-1000": {
    title: "1000-word burst",
    description:
      "Burst sprint through the 1000 most common English words at threshold WPM.",
  },
  tricky: {
    title: "Tricky-words drill",
    description:
      "Burst-typing drill on the words the average typist trips on most: their / there, weird, rhythm, queue, …",
  },
  pangrams: {
    title: "Pangrams drill",
    description:
      "Burst-typing drill on classic English pangrams — every letter of the alphabet inside one short phrase.",
  },
  "numbers-symbols": {
    title: "Numbers & symbols drill",
    description:
      "Burst-typing drill on numeric and symbolic tokens — the keys casual typists rarely touch but need at speed.",
  },
  "top-100-sprint": {
    title: "Top-100 sprint drill",
    description:
      "Burst sprint through the 100 most common English words. Pure cadence training.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = DRILL_TITLES[id] ?? {
    title: "Drill",
    description: "A focused typing drill on flinttype.",
  };
  return buildPageMetadata({
    title: entry.title,
    description: entry.description,
    path: `/drills/${id}`,
  });
}

export default function DrillLayout({ children }: { children: ReactNode }) {
  return children;
}
