"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { closeMobileNav } from "@/components/ft";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types/notification";
import { BellIcon, NotificationRow } from "./notification-row";

/** Bell + popover. Reads the live feed from
 *  `backend.notifications.list()`. Anonymous viewers don't see the
 *  bell at all — the routes sit behind requireAuth and there's
 *  nothing to show until the user has an account.
 *
 *  Theme: theme-aware semantic classes per ui-law §2.1 — the chrome
 *  swaps cleanly under the mode toggle and the palette switcher. */
export function NotificationsPopover() {
  const { isSignedIn, isLoaded } = useUser();
  const backend = useBackend();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const out = await backend.notifications.list();
      setItems(out.items);
      setUnreadCount(out.unreadCount);
    } catch {
      // Silent: a notifications fetch failure must never break the
      // topbar. Stale data is fine; the next refresh recovers.
    } finally {
      setLoading(false);
    }
  }, [backend, isSignedIn]);

  // Initial fetch + refetch every minute while signed in.
  useEffect(() => {
    if (!isLoaded) return;
    void refresh();
    if (!isSignedIn) return;
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [isLoaded, isSignedIn, refresh]);

  // Refetch when the popover opens — catches notifications created
  // since the last poll without waiting for the next interval tick.
  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  // Click outside / Escape closes.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    // Optimistic — drop unread state instantly so the badge
    // disappears the moment the user clicks. The route either
    // succeeds (no visible change) or fails silently and the next
    // refresh corrects.
    setItems((prev) => prev.map((n) => ({ ...n, readAtMs: n.readAtMs ?? Date.now() })));
    setUnreadCount(0);
    try {
      await backend.notifications.markAllRead();
    } catch {
      void refresh();
    }
  }

  // Mark a single notification read — wired to the race-invite row so
  // clicking through to the lobby clears it from the bell AND the
  // friends dock (whose challenges derive from unread race_invite
  // notifications), instead of pointing at a dead lobby forever
  // (ui-law §17.5 / multiplayer doc). Optimistic, like markAllRead.
  const markOneRead = useCallback(
    (id: string) => {
      let wasUnread = false;
      setItems((prev) =>
        prev.map((n) => {
          if (n.id !== id || n.readAtMs != null) return n;
          wasUnread = true;
          return { ...n, readAtMs: Date.now() };
        }),
      );
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      void backend.notifications.markRead({ id }).catch(() => void refresh());
    },
    [backend, refresh],
  );

  // Anonymous viewers: no bell at all. Avoids a permanently-empty
  // affordance that does nothing on click.
  if (!isLoaded || isSignedIn !== true) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          // The hamburger drawer paints over the top bar's popovers, so
          // close it first or the panel opens hidden beneath it.
          if (!open) closeMobileNav();
          setOpen((o) => !o);
        }}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "relative flex size-11 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:size-9",
          open && "bg-accent text-foreground",
        )}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-1.5 rounded-full bg-primary md:top-1.5 md:right-1.5"
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            // Mobile: full-width sheet pinned below the topbar.
            "fixed inset-x-2 top-[calc(4.25rem+env(safe-area-inset-top))] z-40 flex max-h-[70vh] flex-col overflow-hidden",
            // Desktop: anchored to the bell, fixed width.
            "md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:max-h-[min(70vh,560px)] md:w-[380px]",
            "rounded-2xl border border-border bg-popover text-popover-foreground shadow-float",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-foreground">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary/10 px-1.5 text-[11px] font-semibold tabular-nums text-primary">
                  {unreadCount}
                </span>
              ) : null}
            </span>
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => void markAllRead()}
                // Finger-sized in the phone sheet (§7), compact at md+.
                className="-mr-1.5 h-11 text-muted-foreground md:h-7"
              >
                <CheckCheck aria-hidden />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex flex-col gap-1 px-2 pb-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl px-2.5 py-2.5">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted" />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="h-2.5 w-36 rounded-full bg-muted motion-safe:animate-pulse" />
                      <span className="h-2 w-52 rounded-full bg-muted/70" />
                    </span>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 pb-8 pt-6 text-center">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BellIcon />
                </span>
                <p className="text-sm font-medium text-foreground">
                  You&apos;re all caught up
                </p>
                <p className="text-xs text-muted-foreground">
                  New followers, races and personal bests show up here.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5 px-2 pb-2">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationRow item={n} onMarkRead={markOneRead} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
