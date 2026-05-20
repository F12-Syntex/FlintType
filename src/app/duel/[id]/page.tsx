import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../_components/app-chrome";
import { DuelView } from "../_components/duel-view";

// Static canonical `/duel` for every id is fine *only* because the page
// is noIndex (a duel is private to its two participants). If indexing is
// ever enabled, switch to generateMetadata with the real `/duel/${id}`.
export const metadata = buildPageMetadata({
  title: "Duel",
  path: "/duel",
  noIndex: true,
});

export default async function DuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppChrome>
      <DuelView id={id} />
    </AppChrome>
  );
}
