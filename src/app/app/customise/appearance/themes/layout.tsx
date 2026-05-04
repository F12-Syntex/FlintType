import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Theme explorer",
  description:
    "Browse every flinttype palette as a large, true-to-life preview. Pick the one that suits your eye.",
  path: "/app/customise/appearance/themes",
  noIndex: true,
});

export default function ThemeExplorerLayout({ children }: { children: ReactNode }) {
  return children;
}
