import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/server/seo";
import { SECTIONS } from "./_components/data";

export const metadata = buildPageMetadata({
  title: "Settings",
  description:
    "flinttype settings — caret styles, themes, behaviour, keyboard visualisation, adaptive tuning. Each option ships with a live preview.",
  path: "/app/customise",
  noIndex: true,
});

/** Settings root — bounce to the first section so the URL always names
 *  the visible content (and the sidebar's active highlight is correct). */
export default function CustomiseIndexPage() {
  redirect(`/app/customise/${SECTIONS[0]!.id}`);
}
