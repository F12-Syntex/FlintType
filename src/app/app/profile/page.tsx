import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { ProfileView } from "./_components/profile-view";

export const metadata = buildPageMetadata({
  title: "Profile",
  description:
    "flinttype profile — name, level, lifetime totals, streak, personal bests, activity heatmap, and WPM trend.",
  path: "/app/profile",
  noIndex: true,
});

export default function ProfilePage() {
  return (
    <AppChrome>
      <ProfileView />
    </AppChrome>
  );
}
