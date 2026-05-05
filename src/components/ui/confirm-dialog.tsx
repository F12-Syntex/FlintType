"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmVariant?: "default" | "destructive";
}) {
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);

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
    onConfirm();
    onOpenChange(false);
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
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-foreground/45 backdrop-blur-sm transition-opacity ease-out",
          entered ? "opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${ANIM_MS}ms` }}
      />
      <div
        className={cn(
          "relative flex w-full flex-col overflow-hidden",
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
            className="h-9"
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
