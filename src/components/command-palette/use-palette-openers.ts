"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/command-palette/open";
import { isTypingSurfaceActive } from "@/lib/typing-surface";

/** True when the focused element is text-editable, so a global Escape
 *  binding shouldn't steal it (the user may be blurring / clearing an
 *  input, or typing the practice passage into the hidden input). */
function isEditableTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

/** True while one of our own modal overlays is open (the settings
 *  import dialog, a confirm dialog, a sheet, the friends dock's panel).
 *  Each traps focus itself, so the palette never opens on top of one. */
function modalOverlayOpen(): boolean {
  return !!document.querySelector('[role="dialog"][aria-modal="true"],[role="alertdialog"]');
}

/** The palette's global openers (ui-law §16.1): Cmd/Ctrl+K toggles it
 *  (it never opens over a modal overlay), Escape opens it when Escape
 *  would otherwise do nothing, and the `openCommandPalette()` event
 *  opens it from "Search" buttons. */
export function usePaletteOpeners(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  // `open` read inside the global key handler without re-subscribing.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Two global openers:
  //   - Cmd / Ctrl + K toggles the palette (the canonical shortcut).
  //   - Escape ALSO opens it — but only when Escape would otherwise do
  //     nothing. Escape is heavily overloaded (close a dialog/popover/
  //     dropdown, the friends dock, the bell, clear focus mode, blur an
  //     input, back out of the palette's own sub-view), so we open only
  //     when none of those apply: the palette is closed, no overlay is
  //     open, focus mode is off, and the user isn't mid-edit. When the
  //     palette is open, its capture handler (onKeyDownInside) owns
  //     Escape, so we bail here.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!openRef.current && modalOverlayOpen()) return;
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (openRef.current) return;
        // Someone already handled this Escape — e.g. Radix closing the
        // palette (or another dialog) on the same keystroke. Without
        // this the palette's own closing Escape reopened it.
        if (e.defaultPrevented) return;
        if (isEditableTarget(document.activeElement)) return;
        // A mounted typing-capture surface (practice / burst / race)
        // owns Escape as a restart gesture via its own window handler,
        // even when focus sits on <body> (clicking dead chrome mid-run).
        // Escape there "does something", so per ui-law §16 the palette
        // must NOT also open (#55 / FT-020).
        if (isTypingSurfaceActive()) return;
        if (document.documentElement.getAttribute("data-ft-focus") === "on") {
          return; // let the focus-mode shortcut clear it
        }
        // An open overlay/disclosure should get Escape to close itself
        // first. Each of these is present in the DOM only while open:
        // Radix dialogs/alertdialogs + the notifications popover
        // (role=dialog), Radix poppers (popover/dropdown/select/tooltip),
        // and the friends dock / bell triggers (aria-expanded).
        if (
          document.querySelector(
            '[role="dialog"],[role="alertdialog"],[data-radix-popper-content-wrapper],button[aria-label="Friends"][aria-expanded="true"],button[aria-label*="Notifications"][aria-expanded="true"]',
          )
        ) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
    }
    // Programmatic opener — "Search settings" buttons and similar
    // affordances dispatch this instead of importing the palette.
    const onOpenRequest = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    };
  }, [setOpen]);
}
