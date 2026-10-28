import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Stats and results settings",
  description:
    "Choose which live numbers show while you type, and exactly what the result screen shows you after every finished typing test.",
  path: "/customise/stats",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
