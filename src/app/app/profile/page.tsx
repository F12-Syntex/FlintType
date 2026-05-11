import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Profile",
  description: "Your flinttype profile.",
  path: "/app/profile",
  noIndex: true,
});

/** /app/profile is the entrypoint for the signed-in user's own
 *  profile — bounce them to the canonical /app/profile/<username>
 *  URL so the page is shareable. Falls back to a Clerk-id slug when
 *  the user hasn't set a username yet (still unique per user, just
 *  uglier — clerk_user_… ). Unauthenticated reads bounce to sign-in
 *  via the global Clerk middleware before they get here. */
export default async function ProfileIndexPage() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  const user = await currentUser();
  const slug =
    user?.username ??
    user?.emailAddresses[0]?.emailAddress.split("@")[0] ??
    session.userId;
  redirect(`/app/profile/${slug}`);
}
