import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { FriendsView } from "./_components/friends-view";

/** /friends — a signed-in-only social surface, so it stays out of
 *  search (S8) and off the sitemap / llms.txt. */
export const metadata = buildPageMetadata({
  title: "Friends",
  path: "/friends",
  noIndex: true,
});

export default function FriendsPage() {
  return (
    <AppChrome>
      <FriendsView />
    </AppChrome>
  );
}
