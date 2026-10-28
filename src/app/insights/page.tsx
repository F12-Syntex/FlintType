import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { requireSession } from "../_components/require-session";
import { InsightsView } from "./_components/insights-view";

export const metadata = buildPageMetadata({
  title: "Insights",
  description:
    "Your typing model: what to practise next, your slowest letter pairs and words, your WPM trend, and a playground that scores any text against you.",
  path: "/insights",
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
