"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Swords, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ft";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { DockPanelBody } from "./dock-panel";
import { useDockData } from "./use-dock-data";

const DEV = process.env.NODE_ENV === "development";

/** Routes where the dock would fight an intentionally immersive surface:
 *  the dark race screen (incl. private lobbies at /race/c/<slug>), the
 *  fullscreen live-watch clone, the auth pages, the standalone
 *  cover/landing asset, and the `/updates/<slug>` promo cards — both meant
 *  to be screenshotted clean, with no app chrome (§19), so the pill must
 *  not float over them. Everywhere else (practice, customise, leaderboard,
 *  profile, …) it floats quietly in the corner. The 404 / error pages have
 *  no fixed pathname to match, so they opt out via `data-ft-no-dock`
 *  instead (see <HideFriendsDock>). */
const HIDDEN_PREFIXES = [
  "/race",
  "/live",
  "/sign-in",
  "/sign-up",
  "/landing",
  "/updates",
];

/** Reads a `data-*` attribute off <html>, kept in sync with a observer so
 *  the dock can step aside while a run is active (`data-ft-running`) or
 *  focus mode is on (`data-ft-focus`) — the two states where the user
 *  asked the chrome to disappear (ui-law §15). */
function useHtmlFlag(attr: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setOn(el.getAttribute(attr) === "1" || el.getAttribute(attr) === "on");
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: [attr] });
    return () => obs.disconnect();
  }, [attr]);
  return on;
}

/** Live height (px) of the page footer, so the dock can float just
 *  above it. Returns 0 when the footer isn't there — which is exactly
 *  what we want for all the ways it can vanish: the §15 "hidden" footer
 *  style (display:none), the compact-chrome footer that drops at <md,
 *  or a route with no footer at all. Then the dock falls back to its
 *  normal corner gap instead of floating in dead space.
 *
 *  Re-measures on route change (the footer remounts per page), on
 *  resize (the compact footer flips at the md breakpoint), and when the
 *  footer-style attribute toggles on <html>. */
function useFooterHeight(routeKey: string): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>("[data-ft-footer]");
      if (!el) {
        setHeight(0);
        return;
      }
      const visible = getComputedStyle(el).display !== "none";
      setHeight(visible ? el.getBoundingClientRect().height : 0);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const el = document.querySelector<HTMLElement>("[data-ft-footer]");
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    const mo = new MutationObserver(measure);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ft-footer-style"],
    });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [routeKey]);
  return height;
}

/** The friends dock — a small, non-intrusive floating affordance pinned
 *  to the bottom-right corner that replaces the old /friends page. It
 *  collapses to a slim pill (live / online avatars + count) and expands
 *  into a panel with live broadcasters, pending challenges, and a
 *  searchable directory. Mounted once globally from providers.tsx.
 *
 *  On mobile the expanded surface is the §10.5 bottom sheet, not the
 *  floating panel. Animation is the single sanctioned friends reveal
 *  (ui-law §13); it collapses to a static toggle under reduced motion. */
export function FriendsDock() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
  const running = useHtmlFlag("data-ft-running");
  const focus = useHtmlFlag("data-ft-focus");
  // Pathless full-page surfaces (404 / error) opt out via this flag —
  // their own footer owns the bottom-right corner (FT-052).
  const noDock = useHtmlFlag("data-ft-no-dock");
  const footerHeight = useFooterHeight(pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [last, setLast] = useState({ pathname, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // Real data needs auth; dev shows dummy so the dock is reviewable.
  const visible =
    isLoaded &&
    !hiddenRoute &&
    !noDock &&
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

  // Clear search whenever the panel closes, so the next open always
  // starts on the full list.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Desktop: Escape + click-outside close. Mobile sheet owns its own.
  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open, isMobile]);

  const { stack, label, labelClass } = useMemo(() => {
    const liveIds = new Set(data.live.map((u) => u.userId));
    const onlineUsers = data.directory.filter(
      (u) => data.presenceById.get(u.userId)?.online && !liveIds.has(u.userId),
    );
    const items = [
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
      style={{
        right: "calc(0.75rem + env(safe-area-inset-right))",
        // Float just above the page footer when it's there; when the
        // footer is hidden (the §15 "hidden" footer style, compact-mobile
        // chrome, or a footer-less route) `footerHeight` is 0 and the
        // dock falls back to the normal corner gap instead of hovering
        // in dead space.
        bottom: `calc(${footerHeight}px + var(--ft-dock-gap) + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Desktop floating panel. Mobile uses the bottom sheet below. */}
      {!isMobile ? (
        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              // Quiet, fast fade — no slide, no spring, no stagger. The
              // panel just appears.
              initial={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              style={{ transformOrigin: "bottom right" }}
              // Fixed height so switching between Friends and the Member
              // directory never resizes the panel — the views move within
              // a stable frame.
              className="h-[min(72dvh,540px)] w-[min(88vw,360px)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
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

      {/* Collapsed pill — always present; the dock's resting state. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Friends"
        aria-expanded={open}
        className="group flex h-11 items-center gap-2 rounded-md border border-border bg-card pl-2 pr-3 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {stack.length > 0 ? (
          <span className="flex -space-x-2">
            {stack.map((s) => (
              <Avatar
                key={s.id}
                src={s.src}
                alt={s.name}
                size="sm"
                status={s.status}
                dotRing="ring-card"
              />
            ))}
          </span>
        ) : (
          <span className="inline-flex size-7 items-center justify-center text-muted-foreground">
            <Users size={18} aria-hidden />
          </span>
        )}
        <span className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] tabular-nums", labelClass)}>
          {label}
        </span>
        {data.challenges.length > 0 ? (
          <span className="flex items-center gap-1 border-l border-border pl-2 text-[11px] font-semibold tabular-nums text-muted-foreground">
            <Swords size={13} aria-hidden />
            {data.challenges.length}
          </span>
        ) : null}
      </button>
    </div>
  );
}
