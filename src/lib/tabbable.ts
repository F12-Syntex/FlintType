/** What keyboard focus can land on, and Tab wrapping, for the modal
 *  focus trap (`focus-trap.ts`). Pure DOM helpers, no React. */

const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "iframe",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
].join(",");

/** Rendered and not hidden (display:none, visibility:hidden, collapsed
 *  details). Opacity is ignored: panels fade in from opacity 0. */
export function isVisible(el: Element): boolean {
  const check = (el as Element & {
    checkVisibility?: (o?: Record<string, boolean>) => boolean;
  }).checkVisibility;
  if (typeof check === "function") {
    return check.call(el, { visibilityProperty: true, checkVisibilityCSS: true });
  }
  return el.getClientRects().length > 0;
}

function tabIndexOf(el: Element): number {
  const attr = el.getAttribute("tabindex");
  if (attr === null) return 0;
  const n = Number.parseInt(attr, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Radios stop Tab once per group: on the checked one, or the first. */
function isRadioStop(el: Element, all: readonly Element[]): boolean {
  if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) {
    return true;
  }
  const group = all.filter(
    (o): o is HTMLInputElement =>
      o instanceof HTMLInputElement && o.type === "radio" && o.name === el.name,
  );
  const checked = group.find((o) => o.checked);
  return checked ? checked === el : group[0] === el;
}

/** The elements Tab visits inside `container`, in document order. */
export function tabbables(container: Element | null): HTMLElement[] {
  if (!container) return [];
  const all = Array.from(container.querySelectorAll<HTMLElement>(TABBABLE));
  return all.filter(
    (el) =>
      tabIndexOf(el) >= 0 &&
      !el.closest("[inert]") &&
      isRadioStop(el, all) &&
      isVisible(el),
  );
}

/** Can take focus right now: attached, enabled, not inert, rendered. */
export function canFocus(el: HTMLElement): boolean {
  return (
    el.isConnected &&
    !(el as HTMLButtonElement).disabled &&
    !el.closest("[inert]") &&
    isVisible(el)
  );
}

/** Touch-first device: overlays focus their panel rather than a control,
 *  so no on-screen keyboard or stray focus ring appears on open. */
export function coarsePointer(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
}

const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
const PRECEDING = 2; // Node.DOCUMENT_POSITION_PRECEDING

/** Keep Tab / Shift+Tab inside `panel`, wrapping at either end. Ends are
 *  found by document order, so focus on something outside the Tab order
 *  (the panel itself, a tabindex=-1 segment) still wraps correctly. */
export function wrapTab(e: KeyboardEvent, panel: HTMLElement, active: Element | null) {
  const items = tabbables(panel);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    e.preventDefault();
    panel.focus({ preventScroll: true });
    return;
  }
  if (!active || !panel.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }
  const pos = (el: Element) => active.compareDocumentPosition(el);
  const atEnd = e.shiftKey
    ? !items.some((el) => el !== active && pos(el) & PRECEDING)
    : !items.some((el) => el !== active && pos(el) & FOLLOWING);
  if (!atEnd) return;
  e.preventDefault();
  (e.shiftKey ? last : first).focus();
}
