import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Multiplayer and social settings",
  description:
    "Tune how live races look, from player colours to the race feed, and choose exactly which friends can watch you practise live.",
  path: "/customise/social",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
