import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Appearance",
  description:
    "Customise flinttype's look — themes, colors, geometry, caret style, typography, keyboard, and background. Live previews on every option.",
  path: "/app/customise/appearance",
  noIndex: true,
});

export default function AppearanceLayout({ children }: { children: ReactNode }) {
  return children;
}
