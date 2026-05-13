"use client";

import { useEffect, useState } from "react";

/** Internal hook powering `<LeaveGuard>` — see leave-guard.tsx. Splits
 *  the listener wiring from the dialog rendering so the dialog markup
 *  can live in a `.tsx` sibling and pure listener logic stays here.
 *
 *  Three states:
 *   - `active=false` → no listeners attached at all.
 *   - `active=true` + `bypass=true` → no prompts; nav goes through.
 *     Used post-finish so the results screen feels weightless.
 *   - `active=true` + `bypass=false` → beforeunload prompt the browser
 *     for tab-close / refresh; capture in-app link clicks and defer to
 *     the caller via `pendingHref` (caller renders the dialog and
 *     calls `confirm()` / `cancel()`).
 *
 *  Returns:
 *   - `pendingHref` — href of the link the user clicked, while the
 *     confirm dialog is open. Null otherwise.
 *   - `confirm()` — proceed with the navigation that was deferred.
 *   - `cancel()` — drop the deferred navigation; dialog should close.
 */
export function useLeaveGuard({
  active,
  bypass,
}: {
  active: boolean;
  bypass: boolean;
}): {
  pendingHref: string | null;
  confirm: () => void;
  cancel: () => void;
} {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active || bypass) {
      // Clear any deferred href that was captured before the bypass
      // flipped on — once the race is finished, the user shouldn't
      // see a stale confirm dialog.
      setPendingHref(null);
      return;
    }

    const message =
      "You're in a race. Leaving will drop you out — continue?";

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // ignore middle / right clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-in-tab
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Same-page hash navs (e.g. customise anchor links) don't take
      // the user out of the race surface — let them through.
      if (href.startsWith("#")) return;
      // External / target=_blank — leave alone, browser handles it.
      if (anchor.target && anchor.target !== "_self") return;
      try {
        const resolvedTarget =
          href.startsWith("http") || href.startsWith("//")
            ? new URL(href, window.location.origin)
            : new URL(href, window.location.href);
        if (resolvedTarget.origin !== window.location.origin) return;
        if (
          resolvedTarget.pathname === window.location.pathname ||
          resolvedTarget.pathname.startsWith("/race")
        ) {
          return;
        }
      } catch {
        return;
      }
      // Defer the navigation — preventDefault to block the immediate
      // link traversal, store the resolved href, and let the caller
      // surface the confirmation dialog. `pendingHref` flipping to a
      // string is the signal to render the dialog.
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(anchor.href);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [active, bypass]);

  return {
    pendingHref,
    confirm: () => {
      if (!pendingHref) return;
      // Hard-nav so the race surface tears down cleanly (the React
      // router's soft nav would race against the cleanup effects
      // that drop the user from the room).
      window.location.assign(pendingHref);
    },
    cancel: () => setPendingHref(null),
  };
}
