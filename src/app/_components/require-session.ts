import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { signInHref } from "@/components/auth/sign-in-href";

/** Server-side gate for data-backed pages. The /app shell itself
 *  is now anon-friendly (practice + customise work for everyone)
 *  so each page that genuinely needs a Clerk session asks for it
 *  explicitly via this helper. Bounces to /sign-in on miss, carrying
 *  `path` as the redirect so signing in lands back on the page;
 *  falls through silently when the user is signed in. */
export async function requireSession(path: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect(signInHref(path));
}
