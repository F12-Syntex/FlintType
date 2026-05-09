import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Settings",
  description:
    "flinttype settings — caret styles, themes, behaviour, keyboard visualisation, adaptive tuning. Each option ships with a live preview.",
  path: "/app/customise",
  noIndex: true,
});

/** Settings root — bounce to the Appearance overview so the URL always
 *  names the visible content (and the sidebar's active highlight is
 *  correct). Appearance is the landing surface; sub-pages live under
 *  /app/customise/appearance/<id>. */
export default function CustomiseIndexPage() {
  redirect("/app/customise/appearance");
}
