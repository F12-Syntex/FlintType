/** Modal focus handling for the app's own overlays (<ConfirmDialog>,
 *  <MobileSheet>), framework-free so it can be tested on a plain DOM.
 *  React wiring lives in `use-focus-trap.ts`.
 *
 *  While a trap is active: focus moves into its panel, Tab and Shift+Tab
 *  wrap inside it, focus pulled behind the modal (a closing menu handing
 *  focus back to its trigger) is pulled back in, and Escape closes it.
 *  On release, focus returns to where it was before the modal opened.
 *  Traps stack: only the topmost one acts, so a dialog opened over a
 *  sheet owns the keyboard until it closes. */

import { canFocus, isVisible, tabbables, wrapTab } from "./tabbable";

/** Where focus goes back to on close. `ancestors` (nearest first) cover a
 *  trigger the action removed (the Reset button once nothing is left to
 *  reset): focus lands on the first control still near it. `fallback` is
 *  the return target of the overlay the opener sat in (a sheet item that
 *  opened a dialog), used once that overlay is gone too. */
export type ReturnTarget = {
  el: HTMLElement;
  ancestors: HTMLElement[];
  fallback: ReturnTarget | null;
};

type Trap = { panel: HTMLElement; root: HTMLElement; returnTo: ReturnTarget | null };

const stack: Trap[] = [];
/** Last element focused inside each panel: where focus goes back to when
 *  it is pulled in from behind, or on a re-activation (React Strict Mode
 *  re-runs effects). */
const lastInside = new WeakMap<HTMLElement, HTMLElement>();

export function captureReturnTarget(active: Element | null): ReturnTarget | null {
  if (!(active instanceof HTMLElement) || active === active.ownerDocument.body) {
    return null;
  }
  let el = active;
  // A menu item that opens a modal closes its menu, so return to the
  // menu's trigger (Radix labels its menus by their trigger's id).
  const labelledBy = active.closest('[role="menu"]')?.getAttribute("aria-labelledby");
  const trigger = labelledBy
    ? active.ownerDocument.getElementById(labelledBy.split(/\s+/)[0] ?? "")
    : null;
  if (trigger instanceof HTMLElement) el = trigger;
  const ancestors: HTMLElement[] = [];
  let p = el.parentElement;
  for (; p && p !== el.ownerDocument.body && ancestors.length < 4; p = p.parentElement) {
    ancestors.push(p);
  }
  const owner = [...stack].reverse().find((t) => t.panel.contains(el));
  return { el, ancestors, fallback: owner?.returnTo ?? null };
}

export function resolveReturnTarget(t: ReturnTarget | null): HTMLElement | null {
  for (let cur = t; cur; cur = cur.fallback) {
    if (canFocus(cur.el)) return cur.el;
    for (const a of cur.ancestors) {
      if (!a.isConnected) continue;
      const near = tabbables(a)[0];
      if (near) return near;
    }
  }
  return null;
}

export type FocusTrapOptions = {
  /** The overlay's outer element (panel + backdrop). Defaults to panel. */
  root?: HTMLElement | null;
  returnTo: ReturnTarget | null;
  /** Preferred first focus when nothing inside has it yet. */
  initialFocus?: () => HTMLElement | null | undefined;
  onEscape: () => void;
};

/** Activate a trap on `panel`. Returns the release function. */
export function activateFocusTrap(panel: HTMLElement, opts: FocusTrapOptions): () => void {
  const doc = panel.ownerDocument;
  const root = opts.root ?? panel;
  const trap: Trap = { panel, root, returnTo: opts.returnTo };
  stack.push(trap);
  const isTop = () => stack[stack.length - 1] === trap;
  // Behind = earlier in the document than this overlay (the page, or an
  // overlay opened before it). Later portals are overlays on top of it.
  const behind = (n: Node) =>
    !root.contains(n) &&
    (root.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
  const ownsKeys = (a: Element | null) =>
    !a || a === doc.body || root.contains(a) || behind(a);

  const pickInitial = (): HTMLElement => {
    const last = lastInside.get(panel);
    if (last && last.isConnected && panel.contains(last)) return last;
    const auto = panel.querySelector<HTMLElement>("[data-autofocus]");
    if (auto && canFocus(auto)) return auto;
    return opts.initialFocus?.() ?? tabbables(panel)[0] ?? panel;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isTop() || e.defaultPrevented || !isVisible(panel)) return;
    const active = doc.activeElement;
    // Keys pressed in an overlay opened on top (a menu) belong to it.
    if (!ownsKeys(active)) return;
    if (e.key === "Escape") {
      if (e.isComposing) return;
      e.preventDefault();
      opts.onEscape();
      return;
    }
    if (e.key === "Tab" && !e.altKey && !e.ctrlKey && !e.metaKey) {
      wrapTab(e, panel, active);
    }
  };

  let guarding = false;
  const onFocusIn = (e: FocusEvent) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (panel.contains(t)) {
      lastInside.set(panel, t);
      return;
    }
    if (!isTop() || guarding || !isVisible(panel)) return;
    if (!root.contains(t) && !behind(t)) return;
    if (!root.contains(t)) trap.returnTo = captureReturnTarget(t);
    // Re-entrancy guard: another trap (a Radix menu still closing) may
    // pull focus back synchronously; don't ping-pong with it.
    guarding = true;
    try {
      pickInitial().focus({ preventScroll: true });
    } finally {
      guarding = false;
    }
  };

  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("focusin", onFocusIn);
  // The focused control was removed (a picker swapping views): keep
  // focus in the modal instead of dropping it to <body>.
  const observer = new MutationObserver(() => {
    const last = lastInside.get(panel);
    const lost = !doc.activeElement || doc.activeElement === doc.body;
    if (isTop() && lost && last && !last.isConnected) panel.focus({ preventScroll: true });
  });
  observer.observe(panel, { childList: true, subtree: true });

  // Focus already behind the modal is a fresher return target than the
  // one read when it opened (e.g. a closing menu restored its trigger).
  const current = doc.activeElement;
  if (current && current !== doc.body && behind(current)) {
    trap.returnTo = captureReturnTarget(current);
  }
  if (current instanceof HTMLElement && panel.contains(current)) {
    lastInside.set(panel, current); // the caller focused something itself
  } else {
    pickInitial().focus({ preventScroll: true });
  }

  return () => {
    doc.removeEventListener("keydown", onKeyDown);
    doc.removeEventListener("focusin", onFocusIn);
    observer.disconnect();
    const i = stack.indexOf(trap);
    if (i >= 0) stack.splice(i, 1);
    const active = doc.activeElement;
    // Something else already placed focus (the caller, a route change):
    // leave it there.
    if (active && active !== doc.body && !root.contains(active)) return;
    const target = resolveReturnTarget(trap.returnTo);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
    const below = stack[stack.length - 1];
    if (below) {
      const last = lastInside.get(below.panel);
      (last && below.panel.contains(last) ? last : below.panel).focus({ preventScroll: true });
      return;
    }
    // Nowhere to go: don't leave focus on a control in a closing panel.
    if (active instanceof HTMLElement && root.contains(active)) active.blur();
  };
}

/** Test-only: forget every active trap. */
export function __resetFocusTrapsForTests(): void {
  stack.length = 0;
}
