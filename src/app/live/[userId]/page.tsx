import { buildPageMetadata } from "@/server/seo";
import { LiveWatchView } from "../_components/live-watch-view";

// Static canonical `/live` for every spectated user is fine only
// because the page is noIndex (a live session is private to mutual
// friends).
export const metadata = buildPageMetadata({
  title: "Watching live",
  path: "/live",
  noIndex: true,
});

export default async function LiveWatchPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  // No AppChrome — the watch view is a fullscreen, immersive mirror of
  // the broadcaster's screen with its own slim header.
  return <LiveWatchView userId={userId} />;
}
