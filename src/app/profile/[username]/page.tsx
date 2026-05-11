import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../../_components/app-chrome";
import { ProfileView } from "../_components/profile-view";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  return buildPageMetadata({
    title: `@${username}`,
    description: `flinttype profile for @${username} — level, lifetime totals, personal bests, activity heatmap, and WPM trend.`,
    path: `/profile/${username}`,
    noIndex: true,
  });
}

/** Public profile view — anyone (signed in or not) can read it.
 *  ProfileView decides whether the viewer is the owner via Clerk
 *  useUser() and shows / hides the owner-only chrome (Edit, MT
 *  manage, Sign out) accordingly. The data comes from
 *  history.publicProfile when the URL doesn't match the signed-in
 *  user, and history.summary when it does. */
export default async function ProfileByUsernamePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  return (
    <AppChrome>
      <ProfileView username={username} />
    </AppChrome>
  );
}
