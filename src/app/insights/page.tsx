import { Suspense } from "react";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { requireSession } from "../_components/require-session";
import { InsightsLoadingPage } from "./_components/insights-skeleton";
import { InsightsView } from "./_components/insights-view";

export const metadata = buildPageMetadata({
  title: "Insights",
  description:
    "See where your typing time goes, what would help you most, what has changed lately and how your speed is trending, measured against your own tests.",
  path: "/insights",
  noIndex: true,
});

/** /insights. Suspense is required: the view reads `useSearchParams()`
 *  (the bucket lives in the URL), which Next wants inside a boundary. */
export default async function InsightsPage() {
  await requireSession("/insights");
  return (
    <AppChrome>
      <Suspense fallback={<InsightsLoadingPage />}>
        <InsightsView />
      </Suspense>
    </AppChrome>
  );
}
