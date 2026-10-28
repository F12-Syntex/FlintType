import type { ReactNode } from "react";
import { AppChrome } from "../_components/app-chrome";
import { CustomiseHeader } from "./_components/header";
import { SettingsSidebar } from "./_components/sidebar";

/** The settings shell (ui-law §5 "App shell with sidebar", §12): one
 *  scroller holding a centred two-column grid — the sticky settings
 *  nav on the left (lg+) and the group page on the right, capped so
 *  labels and controls stay close. Phones get a sticky header with the
 *  bottom-sheet page picker instead of the sidebar.
 *
 *  The scroller is ours (AppChrome's `compact` main doesn't scroll), and
 *  it's marked `data-customise-scroller` so the sidebar's scroll-spy can
 *  find it. */
export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      <div className="relative min-h-0 flex-1">
        <div
          data-customise-scroller
          className="absolute inset-0 overflow-y-auto overscroll-contain"
        >
          <CustomiseHeader />
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 text-foreground lg:grid-cols-[var(--app-rail-width)_minmax(0,1fr)] lg:gap-12">
            <div className="hidden lg:block">
              <div className="sticky top-0 max-h-[calc(100dvh-7rem)] overflow-y-auto">
                <SettingsSidebar />
              </div>
            </div>
            <div className="min-w-0 pt-6 pb-28 sm:pt-8">{children}</div>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
