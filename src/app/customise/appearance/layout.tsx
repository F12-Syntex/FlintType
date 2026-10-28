import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Settings",
  description:
    "flinttype settings: theme, typing, interface, keyboard, stats, behaviour and multiplayer. Every change applies straight away.",
  path: "/customise/appearance",
  noIndex: true,
});

export default function AppearanceLayout({ children }: { children: ReactNode }) {
  return children;
}
