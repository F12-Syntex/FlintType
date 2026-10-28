import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Interface settings",
  description:
    "Decide how much of the app frames the typing test: card surfaces, rounded corners, outlines, and the top bar and footer.",
  path: "/customise/interface",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
