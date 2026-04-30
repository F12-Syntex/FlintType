"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Frontend-only mock feed. Real backend wiring lands later — keep this
// shape so swapping in a `useBackend().notifications.list()` call is a
// one-line change at the top of the component.
type Notification = {
  id: string;
  title: string;
  body: string;
  // Relative time string ("12m", "3h", "yesterday") — easier than wiring
  // a live timestamp formatter for mock data.
  when: string;
  unread: boolean;
  tone: "ember" | "ink";
};

const MOCK_FEED: Notification[] = [
  {
    id: "n1",
    title: "New personal best",
    body: "92 wpm · 98% acc on EN-COMMON-50. +4 over your previous best.",
    when: "12m",
    unread: true,
    tone: "ember",
  },
  {
    id: "n2",
    title: "Streak: 4 days",
    body: "Type at least one passage today to keep it alive.",
    when: "3h",
    unread: true,
    tone: "ink",
  },
  {
    id: "n3",
    title: "Drill unlocked — bigram balance",
    body: "Your th / he / in pairs are running 18% slower than average. Try it from the drills tab.",
    when: "yesterday",
    unread: false,
    tone: "ink",
  },
];

export function NotificationsPopover({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(MOCK_FEED);
  const wrapRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => n.unread).length;

  // Click outside closes the popover.
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

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "relative flex size-11 items-center justify-center transition-colors md:size-9",
          dark
            ? "text-ft-paper hover:bg-white/5"
            : "text-ft-ink hover:bg-black/5",
        )}
      >
        <BellIcon />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute top-2 right-2 size-1.5 rounded-full bg-ft-ember md:top-1.5 md:right-1.5"
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
            "md:absolute md:inset-x-auto md:top-full md:right-0 md:mt-2 md:w-[320px]",
            "border bg-white shadow-lg",
            dark
              ? "border-[#221F1A] bg-ft-ink text-ft-paper"
              : "border-ft-line-soft text-ft-ink",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3 border-b px-4 py-3",
              dark ? "border-[#221F1A]" : "border-ft-line-soft",
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Notifications
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className={cn(
                  "text-[10px] uppercase tracking-[0.14em] transition-colors",
                  dark
                    ? "text-[#9C978A] hover:text-ft-paper"
                    : "text-ft-dim hover:text-ft-ink",
                )}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div
              className={cn(
                "px-4 py-6 text-center text-[12px]",
                dark ? "text-[#9C978A]" : "text-ft-dim",
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
                    dark ? "border-[#221F1A]" : "border-ft-line-soft",
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
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-1.5 shrink-0 rounded-full",
          item.unread
            ? item.tone === "ember"
              ? "bg-ft-ember"
              : "bg-ft-ink"
            : dark
              ? "bg-[#3A3833]"
              : "bg-ft-line-soft",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12px] font-semibold",
              item.tone === "ember" && "text-ft-ember",
            )}
          >
            {item.title}
          </span>
          <span
            className={cn(
              "shrink-0 text-[10px] uppercase tracking-[0.12em]",
              dark ? "text-[#6E695F]" : "text-ft-dim-2",
            )}
          >
            {item.when}
          </span>
        </div>
        <p
          className={cn(
            "text-[11px] leading-snug",
            dark ? "text-[#9C978A]" : "text-ft-dim-2",
          )}
        >
          {item.body}
        </p>
      </div>
    </div>
  );
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
