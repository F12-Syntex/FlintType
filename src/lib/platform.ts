/** OS/platform detection for keyboard-hint rendering. */

/** True when the given platform / userAgent hint denotes an Apple desktop or
 *  mobile OS, where the command-palette modifier is shown as ⌘ rather than
 *  Ctrl. Pass `navigator.platform || navigator.userAgent`.
 *
 *  Kept as a pure string predicate (no `navigator` access) so it's testable
 *  and isomorphic — the React side reads `navigator` and forwards the hint. */
export function isApplePlatform(hint: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(hint);
}
