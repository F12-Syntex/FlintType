"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { withRedirect } from "@/lib/auth-redirect";
import { useMounted } from "@/lib/use-mounted";

/** The "Create one" / "Sign in" link under the auth card. It carries
 *  the page's `redirect_url` across, so switching between sign-in and
 *  sign-up keeps the destination. The plain href renders first (the
 *  query is only known in the browser). */
export function AltAuthLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const mounted = useMounted();
  const target = mounted
    ? withRedirect(href, window.location.search, window.location.origin)
    : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
