import { IdentDot, TopBar, type NavItem } from "@/components/ft";
import { cn } from "@/lib/utils";
import { AppDrawerExtras } from "./app-drawer-extras";
import { AppFooter } from "./app-footer";
import { ScrollToTop } from "./scroll-to-top";

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
        // Always match the viewport. main scrolls internally if a page
        // outgrows the available height; the chrome (topbar + footer) stays put.
        "flex h-screen flex-col overflow-hidden",
        dark ? "bg-ft-ink text-ft-paper" : "bg-ft-paper text-ft-ink",
        className,
      )}
    >
      <ScrollToTop />
      <TopBar
        nav={NAV}
        dark={dark}
        right={ident ?? <IdentDot>@you · 84 wpm avg</IdentDot>}
        drawerExtras={<AppDrawerExtras dark={dark} />}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
      <AppFooter dark={dark} />
    </div>
  );
}
