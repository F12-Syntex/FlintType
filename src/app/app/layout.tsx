import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { VersionProvider } from "@/lib/version-context";
import { getAppVersion } from "@/server/version";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const version = getAppVersion();
  return <VersionProvider value={version}>{children}</VersionProvider>;
}
