"use client";

import { type RefObject, useEffect, useEffectEvent, useState } from "react";
import {
  activateFocusTrap,
  captureReturnTarget,
  type ReturnTarget,
} from "./focus-trap";

/** Modal keyboard focus for an overlay panel (`focus-trap.ts`): while
 *  `active`, focus moves into `panelRef` (an element the caller already
 *  focused, `[data-autofocus]`, `initialFocus()`, the first control, else
 *  the panel itself, which needs `tabIndex={-1}`), Tab and Shift+Tab stay
 *  inside, and Escape calls `onEscape`. When `active` turns false (or the
 *  overlay unmounts) focus goes back to where it was before it opened.
 *
 *  `rootRef` is the overlay's outer element when the panel sits inside a
 *  larger root with a backdrop. */
export function useFocusTrap({
  active,
  panelRef,
  rootRef,
  initialFocus,
  onEscape,
}: {
  active: boolean;
  panelRef: RefObject<HTMLElement | null>;
  rootRef?: RefObject<HTMLElement | null>;
  initialFocus?: () => HTMLElement | null | undefined;
  onEscape: () => void;
}): void {
  // Where focus was when the overlay opened, read in the render that
  // opens it: by the time an effect runs, an autoFocus child has already
  // taken focus.
  const [wasActive, setWasActive] = useState(false);
  const [returnTo, setReturnTo] = useState<ReturnTarget | null>(null);
  if (active !== wasActive) {
    setWasActive(active);
    if (active && typeof document !== "undefined") {
      setReturnTo(captureReturnTarget(document.activeElement));
    }
  }

  const pickInitial = useEffectEvent(() => initialFocus?.() ?? null);
  const escape = useEffectEvent(() => onEscape());

  useEffect(() => {
    const panel = panelRef.current;
    if (!active || !panel) return;
    return activateFocusTrap(panel, {
      root: rootRef?.current,
      returnTo,
      initialFocus: pickInitial,
      onEscape: escape,
    });
  }, [active, returnTo, panelRef, rootRef]);
}
