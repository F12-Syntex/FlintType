"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { closeMobileNav } from "@/components/ft";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { coarsePointer } from "@/lib/tabbable";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useIsMobile } from "@/lib/use-is-mobile";
import { DockPanelBody } from "./dock-panel";
import { DockPill, type PillAvatar } from "./dock-pill";
import { useDockData } from "./use-dock-data";
import { useFooterOffset } from "./use-footer-offset";
import { useHtmlFlag } from "./use-html-flag";

const DEV = process.env.NODE_ENV === "development";

/** Window event the top bar's friends button dispatches to toggle the
 *  dock (the bottom sheet on phones, a panel under the bar from md). */
export const OPEN_FRIENDS_EVENT = "ft:open-friends";

/** Marks the top bar's friends button, so a click on it isn't read as a
 *  click outside the open panel. */
export const FRIENDS_TRIGGER_ATTR = "data-friends-trigger";

/** Routes where the dock would fight an intentionally immersive surface:
 *  the dark race screen (incl. private lobbies at /race/c/<slug>), the
 *  fullscreen live-watch clone, the auth pages, and the chrome-less
 *  screenshot assets (the cover/landing page, the brand card and the
 *  update cards, which are meant to be captured clean). Everywhere else
 *  (practice, customise, leaderboard, profile, …) it floats quietly in
 *  the corner. */
const HIDDEN_PREFIXES = [
  "/race",
  "/live",
  "/sign-in",
  "/sign-up",
  "/landing",
  "/card",
  "/updates",
];

/** Whether the dock is available on this route at all — the top bar's
 *  mobile friends button hides itself where the dock steps aside. */
export function isFriendsDockRoute(pathname: string): boolean {
  return !HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Whether the dock is open, so the top bar's friends button can
 *  report it (aria-expanded). Written only by <FriendsDock>. */
let dockOpen = false;
const dockOpenListeners = new Set<() => void>();

function publishDockOpen(next: boolean) {
  if (dockOpen === next) return;
  dockOpen = next;
  for (const listener of dockOpenListeners) listener();
}

function subscribeDockOpen(listener: () => void) {
  dockOpenListeners.add(listener);
  return () => {
    dockOpenListeners.delete(listener);
  };
}

/** True while the dock's panel (or phone sheet) is open. */
export function useFriendsDockOpen(): boolean {
  return useSyncExternalStore(subscribeDockOpen, () => dockOpen, () => false);
}

/** The friends dock — a small, non-intrusive floating affordance pinned
 *  to the bottom-right corner that replaces the old /friends page. It
 *  collapses to a slim pill (live / online avatars + count) and expands
 *  into a panel with live broadcasters, pending challenges, and a
 *  searchable directory. Mounted once globally from providers.tsx.
 *
 *  On mobile the expanded surface is the §10.5 bottom sheet, not the
 *  floating panel. Animation is the single sanctioned friends reveal
 *  (ui-law §13); it collapses to a static toggle under reduced motion.
 *
 *  Keyboard: the desktop panel is a labelled dialog. Opening it moves
 *  focus inside (the search field, or the panel itself on touch), Tab
 *  stays inside, Escape closes it, and closing returns focus to the
 *  button that opened it (useFocusTrap, ui-law §7). Because the panel
 *  is mounted after the page, focus would otherwise be a page-length
 *  of Tabs away from the top-bar button. */
export function FriendsDock() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
  const running = useHtmlFlag("data-ft-running");
  const focus = useHtmlFlag("data-ft-focus");
  const footerHeight = useFooterOffset(pathname);
  const [open, setOpen] = useState(false);
  // Where the open panel hangs from: the corner pill (2xl+) or the top
  // bar's friends button (below 2xl, where a floating pill would cover
  // page content).
  const [anchor, setAnchor] = useState<"corner" | "bar">("corner");
  const [query, setQuery] = useState("");
  const [last, setLast] = useState({ pathname, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // Real data needs auth; dev shows dummy so the dock is reviewable.
  const visible =
    isLoaded &&
    !hiddenRoute &&
    !running &&
    !focus &&
    (isSignedIn || DEV);

  const data = useDockData({ enabled: visible, signedIn: !!isSignedIn });

  // Reset on route change or when the dock hides. Done during render
  // (React's sanctioned "adjust state when a prop changes" pattern) so it
  // never trips the set-state-in-effect rule.
  if (last.pathname !== pathname || last.visible !== visible) {
    setLast({ pathname, visible });
    if (pathname !== last.pathname || !visible) {
      setOpen(false);
      setQuery("");
    }
  }

  // The pill only floats at 2xl+ (narrower, it covered page content).
  // Below that the top bar's friends button toggles the dock through
  // this event: the bottom sheet on phones, a panel under the bar from md.
  // It closes the hamburger drawer first: the drawer paints over the
  // dock, so the panel and the focus it takes would hide beneath it.
  useEffect(() => {
    const onToggle = () => {
      closeMobileNav();
      setAnchor("bar");
      setOpen((o) => !o);
    };
    window.addEventListener(OPEN_FRIENDS_EVENT, onToggle);
    return () => window.removeEventListener(OPEN_FRIENDS_EVENT, onToggle);
  }, []);

  const shown = visible && open;
  useEffect(() => {
    publishDockOpen(shown);
  }, [shown]);
  useEffect(() => () => publishDockOpen(false), []);

  // Clear search whenever the panel closes, so the next open always
  // starts on the full list. Adjusted during render (like the route
  // reset above) rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setQuery("");
  }

  // Desktop panel focus + Escape (the phone sheet traps its own). The
  // root is the whole dock, so the corner pill counts as part of it.
  // Escape is claimed at the document, before the command palette's
  // window-level Escape opener sees it.
  useFocusTrap({
    active: shown && !isMobile,
    panelRef,
    rootRef: containerRef,
    onEscape: () => setOpen(false),
    initialFocus: () =>
      coarsePointer()
        ? panelRef.current
        : panelRef.current?.querySelector<HTMLElement>("input"),
  });

  // Desktop click-outside close. Mobile sheet owns its own.
  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (containerRef.current?.contains(target)) return;
      // The bar button toggles on its own click.
      if (target.closest?.(`[${FRIENDS_TRIGGER_ATTR}]`)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, isMobile]);

  const { stack, label, labelClass } = useMemo(() => {
    const liveIds = new Set(data.live.map((u) => u.userId));
    const onlineUsers = data.directory.filter(
      (u) => data.presenceById.get(u.userId)?.online && !liveIds.has(u.userId),
    );
    const items: PillAvatar[] = [
      ...data.live.map((u) => ({ id: u.userId, src: u.imageUrl, name: u.name, status: "live" as const })),
      ...onlineUsers.map((u) => ({ id: u.userId, src: u.imageUrl, name: u.name, status: "online" as const })),
    ].slice(0, 3);
    if (data.live.length > 0)
      return { stack: items, label: `${data.live.length} live`, labelClass: "text-primary" };
    if (onlineUsers.length > 0)
      return { stack: items, label: `${onlineUsers.length} online`, labelClass: "text-muted-foreground" };
    return { stack: items, label: "Friends", labelClass: "text-muted-foreground" };
  }, [data.live, data.directory, data.presenceById]);

  if (!visible) return null;

  const close = () => setOpen(false);
  const fromBar = open && anchor === "bar" && !isMobile;
  const body = (
    <DockPanelBody
      data={data}
      query={query}
      setQuery={setQuery}
      onNavigate={close}
      onClose={close}
      withHeader={!isMobile}
    />
  );

  return (
    <div
      ref={containerRef}
      // The corner gap mirrors the practice surface's bottom padding
      // (typing-surface.tsx: pb-2 / min-height:900px sm:pb-3) so the dock
      // sits low, its gap above the footer matching the keyboard's — the
      // two bottom-anchored elements line up near the bottom edge.
      className="fixed z-40 flex flex-col items-end gap-2 [--ft-dock-gap:0.5rem] [@media(min-height:900px)]:sm:[--ft-dock-gap:0.75rem]"
      style={
        fromBar
          ? {
              // Hang under the 64px top bar, by its friends button, on
              // the bar's own gutter (md+: px-6) so its right edge lines
              // up with the avatar and the avatar menu.
              right: "calc(1.5rem + env(safe-area-inset-right))",
              top: "calc(4rem + env(safe-area-inset-top) + 0.5rem)",
            }
          : {
              right: "calc(0.75rem + env(safe-area-inset-right))",
              // Float just above the page footer when it's there; when
              // the footer is hidden (the §15 "hidden" footer style,
              // compact-mobile chrome, or a footer-less route)
              // `footerHeight` is 0 and the dock falls back to the normal
              // corner gap instead of hovering in dead space.
              bottom: `calc(${footerHeight}px + var(--ft-dock-gap) + env(safe-area-inset-bottom))`,
            }
      }
    >
      {/* Desktop floating panel. Mobile uses the bottom sheet below. */}
      {!isMobile ? (
        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Friends"
              // The trap's fallback focus target (touch devices).
              tabIndex={-1}
              // Quiet, fast fade — no slide, no spring, no stagger. The
              // panel just appears.
              initial={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              style={{ transformOrigin: fromBar ? "top right" : "bottom right" }}
              // Fixed height so switching between Friends and the Member
              // directory never resizes the panel — the views move within
              // a stable frame.
              className="h-[min(72dvh,540px)] w-[min(88vw,360px)] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float outline-none"
            >
              {body}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        <MobileSheet open={open} onOpenChange={setOpen} title="Friends">
          {body}
        </MobileSheet>
      )}

      {/* Collapsed pill — the dock's resting state, 2xl+ only (below
          that the top bar's friends button opens it). Hidden while the
          panel hangs from the bar. */}
      {isMobile || fromBar ? null : (
        <DockPill
          open={open}
          onToggle={() => {
            setAnchor("corner");
            setOpen((o) => !o);
          }}
          stack={stack}
          label={label}
          labelClass={labelClass}
          challenges={data.challenges.length}
        />
      )}
    </div>
  );
}
