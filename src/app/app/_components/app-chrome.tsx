import { TopBar, type NavItem } from "@/components/ft";
import { cn } from "@/lib/utils";
import { AppDrawerExtras } from "./app-drawer-extras";
import { AppFooter } from "./app-footer";
import { ScrollToTop } from "./scroll-to-top";
import { TopbarActions } from "./topbar-actions";

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
  compact = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
  ident?: React.ReactNode;
  className?: string;
  /** Practice-style chrome: footer is hidden at <md and main does not
   *  scroll. Use for surfaces that must fit in a single viewport on
   *  mobile so the OS keyboard never pushes content off-screen. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        // h-dvh tracks the dynamic viewport — on iOS Safari it shrinks
        // when the OS keyboard rises, so the inner flex layout collapses
        // gracefully instead of overflowing behind the keyboard.
        "flex h-dvh flex-col overflow-hidden",
        dark ? "bg-ft-ink text-ft-paper" : "bg-ft-paper text-ft-ink",
        className,
      )}
    >
      <ScrollToTop />
      <TopBar
        nav={NAV}
        dark={dark}
        right={ident ?? <TopbarActions dark={dark} />}
        drawerExtras={<AppDrawerExtras dark={dark} />}
      />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          compact ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </main>
      <div className={cn(compact && "hidden md:block")}>
        <AppFooter dark={dark} />
      </div>
    </div>
  );
}
