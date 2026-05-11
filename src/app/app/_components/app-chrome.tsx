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
  { href: "/app/insights", label: "INSIGHTS" },
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
        dark
          ? "bg-ft-ink text-ft-paper"
          : "text-foreground",
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
      {/* main owns the bg-scope but does NOT scroll — its ::before
          paints the bg image with position:absolute inset:0, which
          must stay pinned to the visible main area. The inner div
          handles scrolling so the bg never scrolls off the top. */}
      <main
        data-bg-scope="content"
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          className={cn(
            // Global horizontal page-pad so /app surfaces breathe off
            // the chrome edge. Per-page sections may still add their
            // own additional inset; this is the floor.
            "absolute inset-0 flex flex-col px-2 sm:px-4 lg:px-6",
            compact ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </main>
      <AppFooter dark={dark} compact={compact} />
    </div>
  );
}
