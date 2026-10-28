import { TopBar, type NavItem } from "@/components/ft";
import { cn } from "@/lib/utils";
import { AppDrawerExtras } from "./app-drawer-extras";
import { AppFooter } from "./app-footer";
import { DiscordBanner } from "./discord-banner";
import { ScrollToTop } from "./scroll-to-top";
import { TopbarActions } from "./topbar-actions";

const NAV: NavItem[] = [
  { href: "/", label: "Practice" },
  { href: "/drills", label: "Drills" },
  { href: "/race", label: "Races" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/insights", label: "Insights" },
];

/** The app frame: top bar, a scrolling main, and the footer.
 *
 *  - Scrolling pages: the Discord nudge and the footer ride inside the
 *    scroll container, so they scroll away with the content instead of
 *    eating ~150px of a phone screen permanently.
 *  - `compact` pages (practice, races and the settings shell
 *    that own their own scrolling): main never scrolls, there is no
 *    promo strip, and the footer is pinned at md+ and hidden on phones
 *    so the OS keyboard can't push the typing area off-screen.
 *
 *  Every horizontal edge shares one gutter (`px-4 sm:px-6`) with the top
 *  bar, so the logo, page content and footer line up on every route. */
export function AppChrome({
  children,
  className,
  compact = false,
}: {
  children: React.ReactNode;
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
        "flex h-dvh flex-col overflow-hidden text-foreground",
        className,
      )}
    >
      <ScrollToTop />
      <TopBar
        nav={NAV}
        right={<TopbarActions />}
        drawerExtras={<AppDrawerExtras />}
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
          data-ft-scroller
          className={cn(
            "absolute inset-0 flex flex-col",
            compact ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {compact ? null : <DiscordBanner />}
          <div
            // data-screenshot-root marks the "content area" — the
            // result-page export buttons (test-summary, race-results)
            // walk up the DOM to find this element and capture it.
            // Excludes the top bar, promo strip and footer by design.
            data-screenshot-root="true"
            className={cn(
              "flex flex-col px-4 sm:px-6",
              compact ? "min-h-0 flex-1" : "flex-1 shrink-0",
            )}
          >
            {children}
          </div>
          {compact ? null : <AppFooter />}
        </div>
      </main>
      {compact ? <AppFooter pinned /> : null}
    </div>
  );
}
