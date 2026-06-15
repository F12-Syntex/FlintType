"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { cn } from "@/lib/utils";

/** Responsive confirmation dialog. On mobile it slides up from the
 *  bottom (mirrors <MobileSheet>'s 220 ms ease-out animation, fixed
 *  height); on desktop it lands as a centered floating panel with the
 *  same body content. Use whenever a destructive or irreversible action
 *  needs an "are you sure" gate — settings imports, "Reset all", etc.
 *
 *  Anatomy:
 *    [backdrop]
 *      [panel]
 *        [header] title + close X
 *        [body]   children
 *        [footer] cancel + confirm buttons
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
   *  auto-close the dialog. Used by multi-phase flows (e.g. the
   *  MonkeyType import) where success / error feedback needs to stay
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
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus into the panel on open, trap Tab inside it, restore on close —
  // the aria-modal surface must not let focus walk the page behind it
  // (FT-054). Active only while the panel is actually mounted.
  useFocusTrap(open && render, panelRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    setEntered(false);
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

  function handleConfirm() {
    onConfirm?.();
    if (!keepOpen) onOpenChange(false);
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        // Out of the Tab order — it's a sibling of the trapped panel, and
        // the in-panel close affordances + Escape already cover keyboard
        // dismissal. Mouse click still closes (FT-054).
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-foreground/45 backdrop-blur-sm transition-opacity ease-out",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col overflow-hidden focus:outline-none",
          // Mobile: bottom sheet, fixed height.
          "h-[75dvh] rounded-t-2xl border-t safe-pb",
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
        {/* Mobile grab handle — desktop suppresses via md:hidden. */}
        <button
          type="button"
          aria-label="Close"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          {children}
        </div>
        {hideFooter ? null : (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background/60 px-4 py-3 md:px-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9"
            >
              {cancelLabel}
            </Button>
            <Button
              variant={confirmVariant === "destructive" ? "destructive" : "default"}
              size="sm"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className="h-9"
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
