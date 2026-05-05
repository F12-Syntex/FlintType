"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** Bottom-anchored mobile modal — slides up from the bottom edge with a
 *  fixed pixel-stable height every time it opens, so the user's mental
 *  map of "where the controls live" doesn't shift between settings.
 *
 *  Use anywhere a desktop popover/dropdown would feel cramped on a
 *  375 px viewport (theme picker, font picker, colour picker, section
 *  picker, import-source picker, …). Pair with `useIsMobile()` so the
 *  desktop path keeps its existing Popover/DropdownMenu surface.
 *
 *  Anatomy:
 *    [backdrop] click closes
 *      [sheet]
 *        [header] title + close button
 *        [body]   scrollable content area
 *
 *  Height is fixed at 75dvh (dynamic viewport — hugs Safari/Chrome
 *  toolbars correctly). Respect the iOS home-indicator inset via
 *  `safe-pb` on the sheet's bottom padding. */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  children,
  /** Optional left-slot in the header — typically a back button when the
   *  sheet hosts a multi-step picker (e.g. preset → custom colour wheel). */
  leading,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  children: ReactNode;
  leading?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Body scroll lock + Escape close while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  const sheet = (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — click closes. */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      {/* Sheet — fixed height every time. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[75dvh] flex-col",
          "rounded-t-2xl border-t border-border bg-background text-foreground shadow-2xl",
          "safe-pb",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {leading}
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
