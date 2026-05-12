"use client";

import { useEffect } from "react";

/** Confirm before leaving an in-progress race. Two routes out:
 *
 *  1. The browser tab itself (close, refresh, hard back) — handled
 *     via `beforeunload`. We return a string so the browser shows
 *     its native "Are you sure?" dialog. Modern browsers ignore the
 *     custom message but still show the prompt.
 *  2. An in-app `<Link>` click (TopBar nav to drills / insights /
 *     practice). We attach a document-level capture-phase click
 *     listener on the nearest enclosing `<a href>`; if the user
 *     confirms via window.confirm we let the navigation proceed,
 *     otherwise we preventDefault.
 *
 *  Activates only when `active` is true so the guard is silent on
 *  the queue surface and the finished panel. The shell flips it on
 *  the moment a room handle is set. */
export function useLeaveGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const message =
      "You're in a race. Leaving will drop you out — continue?";

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Some older browsers read `returnValue`, modern Chromium reads
      // the canonical preventDefault + ignores the returned string.
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
      // Stay on /race subpaths without prompting (challenge join page
      // is the same race surface and we want the user to slide into
      // it without a dialog).
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
      const ok = window.confirm(message);
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [active]);
}
