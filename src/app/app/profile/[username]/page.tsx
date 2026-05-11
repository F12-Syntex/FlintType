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
    path: `/app/profile/${username}`,
    noIndex: true,
  });
}

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
