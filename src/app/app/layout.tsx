import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { IdentDot, TopBar, type NavItem } from "@/components/ft";

const NAV: NavItem[] = [
  { href: "/app", label: "PRACTICE" },
  { href: "/app/drills", label: "DRILLS" },
  { href: "/app/race", label: "RACES" },
  { href: "/app/history", label: "HISTORY" },
  { href: "/app/customise", label: "CUSTOMISE" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col bg-ft-paper text-ft-ink">
      <TopBar
        nav={NAV}
        ident={<IdentDot>@you · 84 wpm avg</IdentDot>}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
