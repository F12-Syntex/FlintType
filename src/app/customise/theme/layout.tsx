import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Theme settings",
  description:
    "Pick a colour palette, switch between light and dark mode, fine-tune single colours and set a background image behind the app.",
  path: "/customise/theme",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
