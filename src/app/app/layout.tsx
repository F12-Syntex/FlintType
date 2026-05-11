import { VersionProvider } from "@/lib/version-context";
import { getAppVersion } from "@/server/version";

/** /app/* shell. The auth gate that used to live here moved out:
 *  the practice surface (/app) and customise pages work for anon
 *  users — settings save to localStorage via prefs-store's anon
 *  fallback. Data-backed surfaces (profile, insights, drills,
 *  biogram) bounce to /sign-in from their own page-level
 *  Clerk auth() check. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const version = getAppVersion();
  return <VersionProvider value={version}>{children}</VersionProvider>;
}
