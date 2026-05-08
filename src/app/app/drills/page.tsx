import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { DrillsView } from "./_components/drills-view";

export const metadata = buildPageMetadata({
  title: "Drills",
  description:
    "Targeted typing drills generated from your bigram weaknesses, plus curated tongue-twister and rhythm sets.",
  path: "/app/drills",
  noIndex: true,
});

export default function DrillsPage() {
  return (
    <AppChrome>
      <DrillsView />
    </AppChrome>
  );
}
