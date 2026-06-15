/** Inline script body injected synchronously into `<head>` so the
 *  user's persisted prefs hit `<html>` BEFORE the first paint —
 *  removes the flash-of-default-state on every refresh (borders
 *  reverting, banners flashing in then out, chrome popping from
 *  elevated to flat, etc.).
 *
 *  This duplicates what BordersApplier / AppearanceApplier /
 *  ApplyThemeOverrides do inside `useEffect`. They still run for
 *  the live-update path (so flipping a setting in the palette
 *  repaints the DOM); this script is purely the pre-hydration
 *  starting point.
 *
 *  Hand-rolled JS string (no imports) so it can run before any
 *  React / module bootstrap. Single-quoted; the string is fed
 *  into `dangerouslySetInnerHTML` in `src/app/layout.tsx`.
 *
 *  Keep this in sync with:
 *    - src/lib/prefs-store.ts (LS_KEY = "flinttype:prefs:v1")
 *    - src/app/appearance-applier.tsx (data-ft-* mapping)
 *    - src/app/borders-applier.tsx
 *    - src/lib/apply-theme-overrides.tsx (theme CSS-var overrides)
 *    - src/app/_components/discord-banner.tsx (banners.discordDismissed) */

export const PREFS_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    // Parse tolerantly and ALWAYS continue with an object — even a fresh
    // visitor with no stored blob must get the shipped appearance defaults
    // pre-paint (below), so we can't early-return on a missing blob.
    var blob = {};
    var raw = window.localStorage.getItem('flinttype:prefs:v1');
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') blob = parsed;
      } catch (_p) { /* corrupted blob — fall through to defaults */ }
    }

    // Appearance: data-ft-* attrs that drive the global CSS cascade.
    // Mirrors src/app/appearance-applier.tsx, which applies the EFFECTIVE
    // prefs (stored value ?? DEFAULT_APPEARANCE) via setOrRemove. We must
    // do the same: each field falls back to its DEFAULT_APPEARANCE value,
    // then set-or-remove against the CSS attr-absent literal. Otherwise an
    // untouched user shows the attr-absent (editorial) state on first
    // paint, then flips to the Monkeytype-leaning shipped defaults after
    // hydration (FT-060). 3rd arg = DEFAULT_APPEARANCE value (keep in sync
    // with src/lib/appearance-prefs.ts), 4th = CSS attr-absent state.
    var ap = (blob.appearance && typeof blob.appearance === 'object') ? blob.appearance : {};
    var setAttr = function (key, stored, shipped, cssAbsent) {
      var v = stored || shipped;
      if (v === cssAbsent) root.removeAttribute(key);
      else root.setAttribute(key, String(v));
    };
    setAttr('data-ft-cards', ap.cardSurfaces, 'subtle', 'solid');
    setAttr('data-ft-dividers', ap.dividers, 'hidden', 'hairline');
    setAttr('data-ft-padding', ap.pagePadding, 'comfortable', 'comfortable');
    setAttr('data-ft-bg-fill', ap.backgroundFill, 'paper', 'paper');
    setAttr('data-ft-topbar-style', ap.topbarStyle, 'flat', 'elevated');
    setAttr('data-ft-footer-style', ap.footerStyle, 'visible', 'visible');
    setAttr('data-ft-autohide', ap.autoHide, 'fade', 'off');
    setAttr('data-ft-result', ap.resultChrome, 'framed', 'framed');
    if (ap.monochromeChrome) {
      root.setAttribute('data-ft-monochrome', 'on');
    } else {
      root.removeAttribute('data-ft-monochrome');
    }
    // Borders — see src/app/borders-applier.tsx (default 'default' = absent).
    if (ap.borders && ap.borders !== 'default') {
      root.setAttribute('data-ft-borders', String(ap.borders));
    } else {
      root.removeAttribute('data-ft-borders');
    }

    // Theme overrides: per-CSS-var values stored under blob.theme.
    // Mirrors src/lib/apply-theme-overrides.tsx.
    var theme = blob.theme;
    if (theme && typeof theme === 'object') {
      for (var key in theme) {
        if (!Object.prototype.hasOwnProperty.call(theme, key)) continue;
        var val = theme[key];
        if (typeof val !== 'string' || !val) continue;
        // Only honour var-names ("--foo"). Defensive: ignore anything else.
        if (key.charAt(0) !== '-' || key.charAt(1) !== '-') continue;
        root.style.setProperty(key, val);
      }
    }

    // Banners: signal dismissal via attrs that CSS hides on.
    // Mirrors src/app/_components/discord-banner.tsx + the MT banner.
    var banners = blob.banners;
    if (banners && typeof banners === 'object') {
      if (banners.discordDismissed) {
        root.setAttribute('data-ft-banner-discord', 'dismissed');
      }
      if (banners.monkeytypeDismissed) {
        root.setAttribute('data-ft-banner-monkeytype', 'dismissed');
      }
    }
  } catch (_e) {
    /* corrupted blob / quota — fall through; React will rehydrate */
  }
})();
`;
