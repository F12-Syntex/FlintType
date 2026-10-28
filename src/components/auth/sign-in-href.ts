import { safeRedirectPath } from "@/lib/auth-redirect";

/** `path` is an in-app path, so any origin can anchor its parse; another
 *  site's URL still fails safeRedirectPath's same-origin check. */
const PARSE_ORIGIN = "https://flinttype.invalid";

/** The sign-in page, set to bring the user back to `path` (e.g.
 *  "/drills/weakness") once they're in. Home, an auth page or anything
 *  safeRedirectPath refuses gives the plain "/sign-in". Works on the
 *  server (redirects) and the client (links). */
export function signInHref(path: string): string {
  const target = safeRedirectPath(path, PARSE_ORIGIN);
  return target === "/"
    ? "/sign-in"
    : `/sign-in?redirect_url=${encodeURIComponent(target)}`;
}
