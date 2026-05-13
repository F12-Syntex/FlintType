import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

/** Clerk's OAuth round-trip lands here for a few hundred ms before
 *  redirecting to `/`. There's no useful content for crawlers, and
 *  the URL frequently carries query params we don't want indexed
 *  either, so we force noindex per docs/seo.md §S8. */
export const metadata = buildPageMetadata({
  title: "Signing in",
  description: "Completing the sign-in redirect.",
  path: "/sign-in/sso-callback",
  noIndex: true,
});

export default function SsoCallbackLayout({ children }: { children: ReactNode }) {
  return children;
}
