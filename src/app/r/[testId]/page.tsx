import { notFound } from "next/navigation";
import { cache } from "react";
import { getDatabase } from "@/db/server";
import { BackendError } from "@/lib/errors";
import { logger } from "@/server/logger";
import { loadSharedTest } from "@/server/routes/share/load";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../_components/app-chrome";
import { ShareCard } from "./_components/share-card";

type Params = { testId: string };

/** React `cache` dedupes between `generateMetadata` and the page render
 *  for the same request — without it, every share-link visit would hit
 *  Clerk + Postgres twice. NOT_FOUND is mapped to `null` so callers
 *  can branch on a value rather than catch BackendError. */
const loadShare = cache(async (testId: string) => {
  try {
    return await loadSharedTest(getDatabase(), testId, logger);
  } catch (err) {
    if (err instanceof BackendError && err.code === "NOT_FOUND") return null;
    throw err;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { testId } = await params;
  const data = await loadShare(testId);
  if (!data) {
    return buildPageMetadata({
      title: "Run not found",
      description: "This flinttype share link is invalid or has expired.",
      path: `/r/${testId}`,
      noIndex: true,
    });
  }
  const wpm = Math.round(data.wpm);
  const acc = Math.round(data.accuracy);
  return buildPageMetadata({
    title: `${data.handle} · ${wpm} wpm · ${acc}% acc`,
    description: `${data.handle} hit ${wpm} wpm at ${acc}% accuracy on flinttype — open the run, then take the same test yourself.`,
    path: `/r/${testId}`,
    // Public link, but we don't want every shared run cluttering Google
    // — the homepage is the canonical entry point. The og:image is
    // still served from the file-based opengraph-image.tsx alongside
    // this page regardless of robots policy.
    noIndex: true,
  });
}

/** Public landing page for a shared run. Visiting this URL is what
 *  every social scraper sees first when a runner shares their card —
 *  the og:image meta drives the rich preview, this page is the click
 *  destination. */
export default async function ShareTestPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { testId } = await params;
  const data = await loadShare(testId);
  if (!data) notFound();
  return (
    <AppChrome>
      <ShareCard data={data} />
    </AppChrome>
  );
}
