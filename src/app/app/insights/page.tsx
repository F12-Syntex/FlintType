import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { requireSession } from "../_components/require-session";
import { InsightsView } from "./_components/insights-view";

export const metadata = buildPageMetadata({
  title: "Insights",
  description:
    "Your typing model — WPM trend, slowest words and bigrams, practical coaching, and a confidence playground that scores any text against your algorithm.",
  path: "/app/insights",
  noIndex: true,
});

export default async function InsightsPage() {
  await requireSession();
  return (
    <AppChrome>
      <InsightsView />
    </AppChrome>
  );
}
