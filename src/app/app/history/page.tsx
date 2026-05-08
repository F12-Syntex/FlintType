import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { HistoryView } from "./_components/history-view";

export const metadata = buildPageMetadata({
  title: "History",
  description:
    "flinttype 90-day history — daily curve, current weaknesses, run log.",
  path: "/app/history",
  noIndex: true,
});

export default function HistoryPage() {
  return (
    <AppChrome>
      <HistoryView />
    </AppChrome>
  );
}
