"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

/** Bottom-anchored mobile modal — slides up from the bottom edge with a
 *  fixed pixel-stable height every time it opens, so the user's mental
 *  map of "where the controls live" doesn't shift between settings.
 *
 *  Animation: backdrop fades in (opacity 0→1) and the sheet slides up
 *  (translate-y full→0) over 220 ms with a soft ease-out curve on
 *  enter; both reverse on exit, and the portal stays mounted until the
 *  exit transition finishes so the user actually sees the sheet glide
 *  down instead of vanishing.
 *
 *  Anatomy:
 *    [backdrop] click closes
 *      [sheet]
 *        [grab handle] iOS-style 32×4 pill, signals dismissibility
 *        [header] optional leading slot + title + close X
 *        [body]   scrollable content area
 *
 *  Height is fixed at 75dvh (dynamic viewport — hugs Safari/Chrome
 *  toolbars correctly). Respect the iOS home-indicator inset via
 *  `safe-pb` on the sheet's bottom padding. */
const ANIM_MS = 220;

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
  // Two-phase visibility so the exit animation can run before unmount:
  //   `render` controls portal mount; `entered` controls the transform/opacity.
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet on open, trap Tab inside it, restore on
  // close — the aria-modal surface must not let focus walk the page
  // behind it (FT-054). Active only while the sheet is actually mounted.
  useFocusTrap(open && render, panelRef);

  useEffect(() => setMounted(true), []);

  // Phase 1 — `open` ↔ `render`. Mount the portal as soon as `open`
  // flips on; on the way out, hold the portal mounted for ANIM_MS so
  // the exit transition has time to play before unmount.
  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    setEntered(false);
    const t = setTimeout(() => setRender(false), ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Phase 2 — once the portal is rendered with `entered=false` (the
  // off-screen / transparent initial state), wait for the browser to
  // *paint* that state, then flip `entered` on so the transition
  // interpolates from off-screen → on-screen. Doing this in the same
  // effect as `setRender(true)` lets React batch the two updates into
  // one commit, which means the browser never sees the initial state
  // at all and the enter animation appears to skip.
  useEffect(() => {
    if (!render || !open) return;
    // Double-rAF: first rAF lands inside the frame that commits
    // `entered=false`; second rAF lands after that frame's paint, so
    // the next state change actually has something to animate from.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [render, open]);

  // Body scroll lock + Escape close while the sheet is rendered.
  useEffect(() => {
    if (!render) return;
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
  }, [render, onOpenChange]);

  if (!mounted || !render) return null;

  const sheet = (
    <div
      className="fixed inset-0 z-[60] md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — fades in/out, click closes. */}
      <button
        type="button"
        aria-label="Close"
        // Out of the Tab order — sibling of the trapped panel; the in-sheet
        // close affordances + Escape cover keyboard dismissal. Click still
        // closes (FT-054).
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-foreground/45 backdrop-blur-sm transition-opacity ease-out",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      />
      {/* Sheet — fixed height, slides up from bottom. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[75dvh] flex-col focus:outline-none",
          "rounded-t-2xl border-t border-border bg-background text-foreground shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.35)]",
          "safe-pb transition-transform ease-out will-change-transform",
          entered ? "translate-y-0" : "translate-y-full",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle — purely cosmetic affordance that signals the
            sheet can be dismissed; click on the handle area also
            closes for users who tap there expecting iOS behaviour. */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="flex h-5 items-center justify-center pt-2"
        >
          <span
            aria-hidden
            className="h-1 w-9 rounded-full bg-foreground/20"
          />
        </button>
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 pt-1 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {leading}
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
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
