/** Body scroll lock shared by the app's overlays (<ConfirmDialog>,
 *  <MobileSheet>, the <MobileNav> drawer). Counted, so overlapping
 *  overlays compose: a sheet
 *  closing while the dialog it opened is still up doesn't unlock the
 *  page under the dialog, and the last one out restores the original
 *  value instead of a stale "hidden". Returns the release function
 *  (safe to call twice). */
let locks = 0;
let saved = "";

export function lockBodyScroll(): () => void {
  if (locks === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = saved;
  };
}
