import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** Server-side gate for data-backed pages. The /app shell itself
 *  is now anon-friendly (practice + customise work for everyone)
 *  so each page that genuinely needs a Clerk session asks for it
 *  explicitly via this helper. Bounces to /sign-in on miss; falls
 *  through silently when the user is signed in. */
export async function requireSession(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
}
