import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { LiveBroadcastView } from "./_components/live-broadcast-view";

export const metadata = buildPageMetadata({
  title: "Live practice",
  path: "/live",
  noIndex: true,
});

export default function LivePage() {
  return (
    <AppChrome>
      <LiveBroadcastView />
    </AppChrome>
  );
}
