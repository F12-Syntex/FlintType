import { Suspense } from "react";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../_components/app-chrome";
import { DuelNewView } from "../_components/duel-new-view";

export const metadata = buildPageMetadata({
  title: "New duel",
  path: "/duel/new",
  noIndex: true,
});

export default function NewDuelPage() {
  return (
    <AppChrome>
      <Suspense fallback={null}>
        <DuelNewView />
      </Suspense>
    </AppChrome>
  );
}
