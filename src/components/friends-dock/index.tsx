"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Swords, Users, X } from "lucide-react";
import Link from "next/link";
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
 *  the dark race screen, the fullscreen live-watch clone, the duel
 *  screen, and the auth pages. Everywhere else (practice, customise,
 *  leaderboard, profile, …) it floats quietly in the corner. */
const HIDDEN_PREFIXES = ["/race", "/live", "/duel", "/sign-in", "/sign-up"];

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
  const footerHeight = useFooterHeight(pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [last, setLast] = useState({ pathname, visible: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // Real data needs auth; dev shows dummy so the dock is reviewable.
  const visible =
    isLoaded && !hiddenRoute && !running && !focus && (isSignedIn || DEV);

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

  const { stack, label, labelClass, activeCount } = useMemo(() => {
    const liveIds = new Set(data.live.map((u) => u.userId));
    const onlineUsers = data.directory.filter(
      (u) => data.presenceById.get(u.userId)?.online && !liveIds.has(u.userId),
    );
    const activeCount = data.live.length + onlineUsers.length;
    const items = [
      ...data.live.map((u) => ({ id: u.userId, src: u.imageUrl, name: u.name, status: "live" as const })),
      ...onlineUsers.map((u) => ({ id: u.userId, src: u.imageUrl, name: u.name, status: "online" as const })),
    ].slice(0, 3);
    if (data.live.length > 0)
      return { stack: items, label: `${data.live.length} live`, labelClass: "text-primary", activeCount };
    if (onlineUsers.length > 0)
      return { stack: items, label: `${onlineUsers.length} online`, labelClass: "text-muted-foreground", activeCount };
    return { stack: items, label: "Friends", labelClass: "text-muted-foreground", activeCount };
  }, [data.live, data.directory, data.presenceById]);

  if (!visible) return null;

  const panelBody = (
    <DockPanelBody
      data={data}
      query={query}
      setQuery={setQuery}
      onNavigate={() => setOpen(false)}
    />
  );

  return (
    <div
      ref={containerRef}
      className="fixed z-40 flex flex-col items-end gap-2"
      style={{
        right: "calc(0.75rem + env(safe-area-inset-right))",
        // Float just above the page footer when it's there; when the
        // footer is hidden (the §15 "hidden" footer style, compact-mobile
        // chrome, or a footer-less route) `footerHeight` is 0 and the
        // dock falls back to the normal corner gap instead of hovering
        // in dead space.
        bottom: `calc(${footerHeight}px + 0.75rem + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Desktop floating panel. Mobile uses the bottom sheet below. */}
      {!isMobile ? (
        <AnimatePresence>
          {open ? (
            <motion.div
              key="panel"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              // Spring slide-up from the pill (the sanctioned friends
              // reveal, ui-law §13). Overdamped so it eases out with no
              // bounce; reduced-motion collapses it to a quick fade.
              transition={
                reduce
                  ? { duration: 0.15 }
                  : { type: "spring", stiffness: 260, damping: 32, mass: 0.9 }
              }
              style={{ transformOrigin: "bottom right" }}
              className="flex max-h-[70dvh] w-[min(88vw,360px)] flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                    Active members
                  </span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {activeCount}
                  </span>
                </span>
                <span className="flex items-center gap-0.5">
                  <Link
                    href="/leaderboard"
                    onClick={() => setOpen(false)}
                    aria-label="Find people to follow"
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus size={16} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close friends"
                    className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </span>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">{panelBody}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        <MobileSheet open={open} onOpenChange={setOpen} title="Active members">
          {panelBody}
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
