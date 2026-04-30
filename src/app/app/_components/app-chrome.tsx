import { IdentDot, TopBar, type NavItem } from "@/components/ft";
import { cn } from "@/lib/utils";

const NAV: NavItem[] = [
  { href: "/app", label: "PRACTICE" },
  { href: "/app/drills", label: "DRILLS" },
  { href: "/app/race", label: "RACES" },
  { href: "/app/history", label: "HISTORY" },
  { href: "/app/customise", label: "CUSTOMISE" },
];

export function AppChrome({
  children,
  dark = false,
  ident,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  ident?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        dark ? "bg-ft-ink text-ft-paper" : "bg-ft-paper text-ft-ink",
        className,
      )}
    >
      <TopBar
        nav={NAV}
        dark={dark}
        ident={ident ?? <IdentDot>@you · 84 wpm avg</IdentDot>}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
