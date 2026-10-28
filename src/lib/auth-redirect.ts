/** Where to send someone after they sign in or sign up.
 *
 *  Links into the auth pages carry `?redirect_url=` (a profile's Follow
 *  link, the AI studio). Only a same-origin path is honoured, so the
 *  parameter can't bounce a user to another site. Anything else, and a
 *  path back into the auth pages themselves, falls back to home. */

const AUTH_PREFIXES = ["/sign-in", "/sign-up"];

/** A safe in-app path for `raw`, or "/". Accepts a path ("/profile/ada")
 *  or an absolute URL on `origin` (Clerk sometimes passes full URLs). */
export function safeRedirectPath(
  raw: string | null | undefined,
  origin: string,
): string {
  if (!raw) return "/";
  let url: URL;
  try {
    // Protocol-relative ("//evil.com") and backslash tricks resolve to
    // another origin here and are rejected below.
    url = new URL(raw, origin);
  } catch {
    return "/";
  }
  if (url.origin !== origin) return "/";
  const isAuthPage = AUTH_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
  );
  if (isAuthPage) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The `redirect_url` of a location's query string, made safe. */
export function redirectFromSearch(search: string, origin: string): string {
  return safeRedirectPath(new URLSearchParams(search).get("redirect_url"), origin);
}

/** `href` with the current page's `redirect_url` carried over, so moving
 *  between sign-in and sign-up keeps the destination. */
export function withRedirect(href: string, search: string, origin: string): string {
  const target = redirectFromSearch(search, origin);
  if (target === "/") return href;
  return `${href}?redirect_url=${encodeURIComponent(target)}`;
}
