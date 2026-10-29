"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { coarsePointer, tabbables } from "@/lib/tabbable";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useMounted } from "@/lib/use-mounted";
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
 *  `safe-pb` on the sheet's bottom padding.
 *
 *  It shows whenever it's open, at any width: the caller decides when
 *  to use a sheet (most branch on useIsMobile(); the settings page
 *  picker uses it below lg, where the sidebar is hidden). A sheet that
 *  hid itself from md opened invisibly on tablets while still locking
 *  the page. From md the panel is centred and capped at max-w-xl.
 *
 *  Keyboard (useFocusTrap): opening focuses the sheet itself on touch
 *  devices (no on-screen keyboard, no stray focus ring), else a control
 *  marked `data-autofocus` or the body's first control. Tab and
 *  Shift+Tab stay inside, Escape closes, and closing returns focus to
 *  the trigger. */
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
  // Portal needs document — only available after mount.
  const mounted = useMounted();
  // Two-phase visibility so the exit animation can run before unmount:
  //   `render` controls portal mount; `entered` controls the transform/opacity.
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    active: open && mounted,
    panelRef,
    rootRef,
    onEscape: () => onOpenChange(false),
    initialFocus: () =>
      coarsePointer() ? panelRef.current : tabbables(bodyRef.current)[0],
  });

  // Phase 1 — `open` ↔ `render`. Mount the portal as soon as `open`
  // flips on, and start the exit transition as soon as it flips off.
  // Adjusted during render (React's "adjust state when a prop
  // changes" pattern) rather than in an effect.
  if (open && !render) setRender(true);
  if (!open && entered) setEntered(false);

  // On the way out, hold the portal mounted for ANIM_MS so the exit
  // transition has time to play before unmount.
  useEffect(() => {
    if (open) return;
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

  // Body scroll lock while rendered, counted so overlapping overlays
  // (a sheet handing off to a dialog) restore it correctly. Escape
  // lives in useFocusTrap.
  useEffect(() => {
    if (!render) return;
    return lockBodyScroll();
  }, [render]);

  if (!mounted || !render) return null;

  const sheet = (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — fades in/out, click closes. Pointer-only: keyboard
          users have the X and Escape. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity ease-out",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      />
      {/* Sheet — fixed height, slides up from bottom. Focusable as the
          trap's fallback; inert while closing so nothing in it can be
          used or keep focus as it slides away. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        inert={!open}
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[75dvh] flex-col outline-none md:mx-auto md:max-w-xl md:border-x",
          "rounded-t-2xl border-t border-border bg-background text-foreground shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.35)]",
          "safe-pb transition-transform ease-out will-change-transform",
          entered ? "translate-y-0" : "translate-y-full",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle — purely cosmetic affordance that signals the
            sheet can be dismissed; click on the handle area also
            closes for users who tap there expecting iOS behaviour.
            Out of the Tab order: the header X is the keyboard close. */}
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
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
            // 44px tap target; the negative margins keep the header
            // height it had at 36px (ui-law §7).
            className="-my-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
