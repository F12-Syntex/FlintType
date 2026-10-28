"use client";

import { useAppVersion } from "@/lib/version-context";

/** The footer's version label. Reads the request-time VERSION through
 *  <VersionProvider> (root layout) so the footer stays importable from
 *  client components — a server-only read here broke client pages that
 *  render <AppChrome>. */
export function FooterVersion() {
  return <span className="tabular-nums">v{useAppVersion()}</span>;
}
