import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "flinttype",
  description:
    "flinttype — open-source typing trainer that diagnoses the specific letter pairs, words, and bursts holding you back, then drills you out of them.",
  path: "/",
});

/** No more landing page — friction-zero entry. The practice surface
 *  at /app works without auth (settings save to localStorage); only
 *  data-backed surfaces (profile, insights, drills, biogram) gate
 *  on a Clerk session. Sign in / sign up live at /sign-in & /sign-up
 *  and are surfaced from the topbar / profile button. */
export default function HomePage() {
  redirect("/app");
}
