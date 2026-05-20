import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { DuelsView } from "./_components/duels-view";

export const metadata = buildPageMetadata({
  title: "Duels",
  path: "/duels",
  noIndex: true,
});

export default function DuelsPage() {
  return (
    <AppChrome>
      <DuelsView />
    </AppChrome>
  );
}
