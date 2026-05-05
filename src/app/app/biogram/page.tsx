import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { BiogramView } from "./_components/biogram-view";

export const metadata = buildPageMetadata({
  title: "Biogram",
  description:
    "Internal view of the adapt algorithm — your bigram, trigram and motor-feature models, recent tests, recency map and a per-word scoring breakdown.",
  path: "/app/biogram",
  noIndex: true,
});

export default function BiogramPage() {
  return (
    <AppChrome>
      <BiogramView />
    </AppChrome>
  );
}
