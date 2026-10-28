import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";
import { drillCopyFor } from "../_components/drill-catalog";

/** Title + description for `/drills/<id>`, read from the same catalog
 *  the drill builders use (`drill-catalog.ts`), so the `<title>` always
 *  names the drill the page runs. Every drill needs an account and the
 *  index is private, so runner pages are noIndex too (SEO S8). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const copy = drillCopyFor(id);
  return buildPageMetadata({
    title: copy ? copy.title : "Drill",
    description: copy
      ? `${copy.contextLabel} drill on flinttype. ${copy.about}`
      : "A focused typing drill on flinttype.",
    path: `/drills/${id}`,
    noIndex: true,
  });
}

export default function DrillLayout({ children }: { children: ReactNode }) {
  return children;
}
