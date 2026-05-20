"use client";

import { useUser } from "@clerk/nextjs";
import { Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { UserTag } from "@/components/ft";
import type {
  Notification,
  PersonalBestData,
  AnnouncementData,
  FollowNotificationData,
  MutualNotificationData,
} from "@/types/notification";

/** Bell + popover. Reads the live feed from
 *  `backend.notifications.list()`. Anonymous viewers don't see the
 *  bell at all — the routes sit behind requireAuth and there's
 *  nothing to show until the user has an account.
 *
 *  Theme: theme-aware semantic classes per ui-law §2.1 — the chrome
 *  swaps cleanly under <ModeToggle> + <ThemeSwitcher>. The legacy
 *  `dark` prop is preserved so the dark race surface can still
 *  request a darker on-ink variant; that branch reaches for the
 *  fixed warm-ink ramp from §2.3 because those surfaces are
 *  intentionally dark regardless of the user's palette. */
export function NotificationsPopover({ dark = false }: { dark?: boolean }) {
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

  // Anonymous viewers: no bell at all. Avoids a permanently-empty
  // affordance that does nothing on click.
  if (!isLoaded || isSignedIn !== true) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "relative flex size-11 items-center justify-center rounded-md transition-colors md:size-9",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-foreground hover:bg-foreground/5",
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
            "fixed inset-x-2 top-[60px] z-40 max-h-[70vh] overflow-y-auto",
            // Desktop: anchored to the bell, fixed width.
            "md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:w-[360px]",
            "rounded-md border shadow-lg",
            dark
              ? "border-ft-ink-line bg-ft-ink-popover text-ft-paper"
              : "border-border bg-popover text-popover-foreground",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3 border-b px-4 py-3",
              dark ? "border-ft-ink-line" : "border-border",
            )}
          >
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                dark ? "text-ft-paper" : "text-foreground",
              )}
            >
              Notifications
              {unreadCount > 0 ? (
                <span
                  className={cn(
                    "ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    "bg-primary text-primary-foreground",
                  )}
                >
                  {unreadCount}
                </span>
              ) : null}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className={cn(
                  "text-[10px] uppercase tracking-[0.14em] transition-colors",
                  dark
                    ? "text-ft-warm-2 hover:text-ft-paper"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {loading && items.length === 0 ? (
            <div
              className={cn(
                "px-4 py-6 text-center text-[12px]",
                dark ? "text-ft-warm-2" : "text-muted-foreground",
              )}
            >
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div
              className={cn(
                "px-4 py-6 text-center text-[12px]",
                dark ? "text-ft-warm-2" : "text-muted-foreground",
              )}
            >
              All caught up.
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((n, i) => (
                <li
                  key={n.id}
                  className={cn(
                    i > 0 && "border-t",
                    dark ? "border-ft-ink-line" : "border-border",
                  )}
                >
                  <Row item={n} dark={dark} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({ item, dark }: { item: Notification; dark: boolean }) {
  const accent = item.kind === "personal_best" || item.kind === "mutual";
  const unread = item.readAtMs == null;
  const href = isAnnouncement(item)
    ? item.data?.href
    : isFollowNotification(item)
      ? `/profile/${item.data.followerUsername ?? item.data.followerId}`
      : isMutualNotification(item)
        ? `/profile/${item.data.friendUsername ?? item.data.friendId}`
        : undefined;
  const body = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          unread
            ? accent
              ? "bg-primary"
              : dark
                ? "bg-ft-paper"
                : "bg-foreground"
            : dark
              ? "bg-ft-warm-3"
              : "bg-muted-foreground/40",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12px] font-semibold",
              accent ? "text-primary" : dark ? "text-ft-paper" : "text-foreground",
            )}
          >
            {item.title}
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] uppercase tracking-[0.12em]",
              dark ? "text-ft-warm-3" : "text-muted-foreground",
            )}
          >
            {formatRelative(item.createdAtMs)}
          </span>
        </div>
        <p
          className={cn(
            "text-[11px] leading-snug",
            dark ? "text-ft-warm-2" : "text-muted-foreground",
          )}
        >
          {item.body}
        </p>
        {isPersonalBest(item) ? <PbDelta data={item.data} dark={dark} /> : null}
        {item.kind === "og_granted" ? (
          <span className="mt-1.5 inline-flex">
            <UserTag tag="og" size="sm" />
          </span>
        ) : null}
        {item.kind === "mutual" ? (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
            <Check size={12} aria-hidden /> Friends
          </span>
        ) : null}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block transition-colors",
          dark ? "hover:bg-white/[0.04]" : "hover:bg-foreground/[0.03]",
        )}
      >
        {body}
      </Link>
    );
  }
  return body;
}

function PbDelta({
  data,
  dark,
}: {
  data: PersonalBestData;
  dark: boolean;
}) {
  if (data.previousWpm == null) {
    return (
      <span
        className={cn(
          "mt-1 inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
          "border-primary/40 bg-primary/[0.06] text-primary",
        )}
      >
        first run
      </span>
    );
  }
  const delta = Math.round(data.wpm - data.previousWpm);
  return (
    <span
      className={cn(
        "mt-1 inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        delta > 0
          ? "border-primary/40 bg-primary/[0.06] text-primary"
          : dark
            ? "border-white/10 bg-white/[0.03] text-ft-warm-2"
            : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {delta > 0 ? `+${delta}` : delta} wpm vs {Math.round(data.previousWpm)}
    </span>
  );
}

function isAnnouncement(n: Notification): n is Notification & {
  data: AnnouncementData;
} {
  return n.kind === "announcement";
}

function isPersonalBest(n: Notification): n is Notification & {
  data: PersonalBestData;
} {
  if (n.kind !== "personal_best") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "wpm" in (n.data as Record<string, unknown>);
}

function isFollowNotification(n: Notification): n is Notification & {
  data: FollowNotificationData;
} {
  if (n.kind !== "follow") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "followerId" in (n.data as Record<string, unknown>);
}

function isMutualNotification(n: Notification): n is Notification & {
  data: MutualNotificationData;
} {
  if (n.kind !== "mutual") return false;
  if (n.data == null || typeof n.data !== "object") return false;
  return "friendId" in (n.data as Record<string, unknown>);
}

function formatRelative(ms: number): string {
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d`;
  const d = new Date(ms);
  return d.toLocaleDateString();
}

function BellIcon() {
  // Inline SVG so we don't pull a stroke-width-2 lucide icon into the topbar
  // (lucide's default weight reads heavier than the typography here).
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

