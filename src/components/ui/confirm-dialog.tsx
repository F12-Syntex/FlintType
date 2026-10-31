"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { coarsePointer, tabbables } from "@/lib/tabbable";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/** Responsive confirmation dialog. On mobile it slides up from the
 *  bottom (mirrors <MobileSheet>'s 220 ms ease-out animation) at the
 *  height of its content, so a one-line "Reset 3 settings?" isn't a
 *  mostly empty sheet; on desktop it lands as a centered floating panel
 *  with the same body content. Use whenever a destructive or irreversible action
 *  needs an "are you sure" gate: "Reset all", a palette switch, an unfollow.
 *
 *  Anatomy:
 *    [backdrop]
 *      [panel]
 *        [header] title + close X
 *        [body]   children
 *        [footer] cancel + confirm buttons
 *
 *  Keyboard (useFocusTrap): opening moves focus into the panel — a
 *  control the caller focused (autoFocus) or marked `data-autofocus`,
 *  else the body's first control, else Cancel; on touch devices the
 *  panel itself, so no on-screen keyboard pops up. Tab and Shift+Tab
 *  stay inside, Escape closes, and closing returns focus to whatever
 *  opened the dialog.
 */
const ANIM_MS = 220;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  /** Variant of the confirm button; "destructive" tints it red so a
   *  cancel-by-default reset flow visibly warns. */
  confirmVariant = "default",
  /** When true, the confirm button fires `onConfirm` but does NOT
   *  auto-close the dialog. Used by multi-phase flows (Edit profile,
   *  the profile's MonkeyType results import) where feedback needs to stay
   *  visible after submit and the consumer closes via `onOpenChange`
   *  on its own schedule. Default false preserves the legacy
   *  click-to-confirm-and-close behaviour every other caller relies
   *  on. */
  keepOpen = false,
  /** Disable the confirm button entirely — useful while an in-flight
   *  request is pending so the user can't double-submit. */
  confirmDisabled = false,
  /** Hide the dialog footer entirely (no confirm / cancel buttons).
   *  Used by surfaces that want to render their own action row
   *  inline in the body. The header's close ✕, click-outside, and
   *  Escape still close the dialog. */
  hideFooter = false,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: "default" | "destructive";
  keepOpen?: boolean;
  confirmDisabled?: boolean;
  hideFooter?: boolean;
}) {
  const mounted = useMounted();
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useFocusTrap({
    active: open && mounted,
    panelRef,
    rootRef,
    onEscape: () => onOpenChange(false),
    initialFocus: () =>
      coarsePointer()
        ? panelRef.current
        : (tabbables(bodyRef.current)[0] ?? tabbables(footerRef.current)[0]),
  });

  // Mount on open; start the exit slide on close. Adjusted during render
  // (React's "adjust state when a prop changes" pattern, as in
  // <MobileSheet>) rather than in an effect; the unmount waits for the
  // slide to finish.
  if (open && !render) setRender(true);
  if (!open && entered) setEntered(false);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setRender(false), ANIM_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!render || !open) return;
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

  function handleConfirm() {
    onConfirm?.();
    if (!keepOpen) onOpenChange(false);
  }

  const dialog = (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Pointer-only dismiss; keyboard users have the X and Escape. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ease-out dark:bg-black/60",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      />
      <div
        ref={panelRef}
        // Focus fallback when nothing inside can take focus.
        tabIndex={-1}
        // Closing: no second confirm, and focus can't stay on a control
        // that is sliding away.
        inert={!open}
        className={cn(
          "relative flex w-full flex-col overflow-hidden outline-none",
          // Mobile: bottom sheet sized to its content.
          "max-h-[85dvh] rounded-t-2xl border-t safe-pb",
          // Desktop: centered, capped width + height, full rounded.
          "md:h-auto md:max-h-[80dvh] md:w-[min(36rem,calc(100vw-2rem))] md:rounded-2xl md:border",
          "border-border bg-background text-foreground shadow-2xl",
          "transition-all ease-out will-change-transform",
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 md:translate-y-4",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle — desktop suppresses via md:hidden. A
            touch affordance, so it stays out of the Tab order. */}
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          onClick={() => onOpenChange(false)}
          className="flex h-5 items-center justify-center pt-2 md:hidden"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-foreground/20" />
        </button>
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 pt-1 pb-3 md:px-5 md:py-4">
          <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="relative inline-flex size-9 items-center justify-center rounded-pill text-muted-foreground transition-colors touch-hit hover:bg-accent hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          {children}
        </div>
        {hideFooter ? null : (
          <footer ref={footerRef} className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background/60 px-4 py-3 md:px-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-11 md:h-9"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant === "destructive" ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className="h-11 md:h-9"
            >
              {confirmLabel}
            </Button>
          </footer>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
