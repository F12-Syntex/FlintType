import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

/** /customise/[section] is a legacy generic settings surface kept for
 *  direct deep-links; the real customise UI lives under
 *  /customise/appearance and /customise/behaviour. Either way the
 *  page is signed-in scaffolding and stays out of search. */
export const metadata = buildPageMetadata({
  title: "Settings section",
  description: "flinttype settings — pick an option to customise.",
  path: "/customise",
  noIndex: true,
});

export default function SectionLayout({ children }: { children: ReactNode }) {
  return children;
}
