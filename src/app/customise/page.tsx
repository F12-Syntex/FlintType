import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/server/seo";
import { DEFAULT_GROUP } from "./_components/groups";

export const metadata = buildPageMetadata({
  title: "Settings",
  description:
    "flinttype settings: theme, typing, interface, keyboard, stats, behaviour and multiplayer. Every change applies straight away.",
  path: "/customise",
  noIndex: true,
});

/** Settings root — land on the first group so the URL always names
 *  what's on screen and the sidebar highlight is right. */
export default function CustomiseIndexPage() {
  redirect(DEFAULT_GROUP.href);
}
