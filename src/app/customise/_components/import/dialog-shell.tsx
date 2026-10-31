"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { coarsePointer } from "@/lib/tabbable";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { dropExit, enterMotion } from "./import-motion";

/** The settings import dialog's frame (ui-law §12.10): a bottom sheet
 *  fixed at 85dvh on phones, so its top edge never moves between steps,
 *  and from md a panel anchored near the top that grows only downward
 *  and never shrinks while open.
 *  It can be made undismissible (while an import is being written) and
 *  takes a dropped file anywhere on the panel or its backdrop. */

const ANIM_MS = 220;

export function ImportDialogShell({
  open,
  onClose,
  dismissible,
  title,
  titleId,
  panelRef,
  footer,
  announcement,
  onFileDrop,
  dropLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  dismissible: boolean;
  title: string;
  titleId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  footer: ReactNode;
  announcement: string;
  /** Set while the current screen takes a dropped file. */
  onFileDrop?: (file: File) => void;
  dropLabel: string;
  children: ReactNode;
}) {
  const mounted = useMounted();
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const close = () => {
    if (dismissible) onClose();
  };

  useFocusTrap({
    active: open && mounted,
    panelRef,
    rootRef,
    onEscape: close,
    // The paste box on open; on touch the panel, so no keyboard pops up.
    initialFocus: () =>
      coarsePointer() ? panelRef.current : (panelRef.current?.querySelector("textarea") ?? null),
  });

  // Mount on open, slide out on close (as <ConfirmDialog>).
  if (open && !render) setRender(true);
  if (!open && entered) setEntered(false);
  if (!onFileDrop && dragDepth !== 0) setDragDepth(0);

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

  useEffect(() => {
    if (!render) return;
    return lockBodyScroll();
  }, [render]);

  // From md the panel never shrinks while it's open, so the footer (and
  // the button just pressed) never jumps up between screens.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !render || !mounted || !panel || typeof ResizeObserver === "undefined") return;
    let tallest = 0;
    panel.style.removeProperty("--import-panel-min");
    const observer = new ResizeObserver(() => {
      const h = panel.offsetHeight;
      if (h <= tallest) return;
      tallest = h;
      panel.style.setProperty("--import-panel-min", `${h}px`);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [open, render, mounted, panelRef]);

  if (!mounted || !render) return null;

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const dialog = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex items-end justify-center md:items-start md:pt-[10dvh]"
      // The whole overlay, backdrop included, catches a dragged file:
      // the browser never opens one in the tab.
      onDragEnter={(e) => {
        e.preventDefault();
        if (onFileDrop && hasFiles(e)) setDragDepth((d) => d + 1);
      }}
      onDragLeave={() => setDragDepth((d) => Math.max(0, d - 1))}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = onFileDrop ? "copy" : "none";
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragDepth(0);
        const file = e.dataTransfer?.files?.[0];
        if (file && onFileDrop) onFileDrop(file);
      }}
    >
      {/* Pointer-only dismiss; keyboard users have the X and Escape. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-[220ms] ease-out motion-reduce:transition-none dark:bg-black/60",
          entered ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        inert={!open}
        className={cn(
          "relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background text-foreground shadow-float outline-none safe-pb",
          "transition-[translate,opacity] duration-[220ms] ease-out motion-reduce:transition-none",
          "md:h-auto md:max-h-[80dvh] md:min-h-[max(22rem,min(var(--import-panel-min,0px),80dvh))] md:w-[min(36rem,calc(100vw-2rem))] md:rounded-2xl md:border",
          entered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 md:translate-y-4",
        )}
      >
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          onClick={close}
          className="flex h-5 shrink-0 items-center justify-center pt-2 md:hidden"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-foreground/20" />
        </button>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 pt-1 pb-3 md:px-5 md:py-4">
          <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            disabled={!dismissible}
            className={cn(
              "relative inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors touch-hit hover:bg-accent hover:text-foreground",
              !dismissible && "invisible",
            )}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div data-import-body className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5">
          {children}
        </div>
        <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-background/60 px-4 py-3 md:justify-end md:px-5">
          {footer}
        </footer>
        <AnimatePresence>
          {onFileDrop && dragDepth > 0 ? (
            <motion.div
              key="drop"
              {...enterMotion("drop", reduce)}
              exit={dropExit(reduce)}
              className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-foreground/30 bg-background/90 text-sm font-medium text-foreground"
            >
              {dropLabel}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
