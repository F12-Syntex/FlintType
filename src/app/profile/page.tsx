import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUsername } from "@/server/auto-username";
import { logger } from "@/server/logger";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Profile",
  description: "Your flinttype profile.",
  path: "/profile",
  noIndex: true,
});

/** /profile is the entrypoint for the signed-in user's own
 *  profile — bounce them to the canonical /profile/<username>
 *  URL so the page is shareable.
 *
 *  Username assignment is lazy: every visit checks the Clerk user's
 *  `username` field; if missing, we derive one from the email
 *  local-part (or name, or userId slug) and write it back to Clerk
 *  via `ensureUsername`. Clerk's own uniqueness constraint enforces
 *  username uniqueness across all users — collisions retry with a
 *  numeric suffix until acceptance.
 *
 *  We do NOT fall back to the email local-part as a URL slug — that
 *  generated unresolvable URLs (e.g. `/profile/eng.saifkhan2003`)
 *  because the `[username]` page looks up by Clerk username, not by
 *  email. The only fallback when Clerk username assignment fails is
 *  the Clerk userId, which the `[username]` page's dual-mode lookup
 *  resolves directly via `client.users.getUser(id)`.
 *
 *  Unauthenticated reads bounce to sign-in via the global Clerk
 *  middleware before they get here. */
export default async function ProfileIndexPage() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  let username: string | null = user.username ?? null;
  if (!username) {
    const client = await clerkClient();
    username = await ensureUsername(client, session.userId, logger);
  }
  redirect(`/profile/${username ?? session.userId}`);
}
