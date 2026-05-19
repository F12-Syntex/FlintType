import { buildPageMetadata } from "@/server/seo";
import { VerifyEmailLink } from "./verify-client";

export const metadata = buildPageMetadata({
  title: "Verifying your sign-in link",
  description: "Completing magic-link verification.",
  path: "/sign-in/verify",
  noIndex: true,
});

/** Landing page for the magic-link email. Clerk's
 *  handleEmailLinkVerification reads the inbound URL and, when the
 *  link is valid, marks the original tab's polling as complete (the
 *  /sign-in form picks it up and redirects). On the same-device case
 *  it completes the sign-in here too. */
export default function VerifyEmailLinkPage() {
  return <VerifyEmailLink />;
}
