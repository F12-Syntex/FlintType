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
    var raw = window.localStorage.getItem('flinttype:prefs:v1');
    if (!raw) return;
    var blob = JSON.parse(raw);
    if (!blob || typeof blob !== 'object') return;
    var root = document.documentElement;

    // Appearance: data-ft-* attrs that drive the global CSS cascade.
    // Mirrors src/app/appearance-applier.tsx + borders-applier.tsx.
    //
    // CRITICAL: the per-field fallback below MUST equal DEFAULT_APPEARANCE
    // in src/lib/appearance-prefs.ts. The globals.css attr-absent base
    // (the setAttr 3rd arg) is NOT the shipped default - e.g. cards render
    // solid with no attr, but the default is "subtle". So for an untouched
    // user (no/partial appearance slice) we apply the real DEFAULT here,
    // otherwise the chrome paints the attr-absent base then flashes to the
    // default once AppearanceApplier hydrates (FT-060).
    var ap = (blob.appearance && typeof blob.appearance === 'object')
      ? blob.appearance : {};
    var setAttr = function (key, value, defaultValue) {
      if (value && value !== defaultValue) {
        root.setAttribute(key, String(value));
      } else {
        root.removeAttribute(key);
      }
    };
    setAttr('data-ft-cards', ap.cardSurfaces || 'subtle', 'solid');
    setAttr('data-ft-dividers', ap.dividers || 'hidden', 'hairline');
    setAttr('data-ft-padding', ap.pagePadding || 'comfortable', 'comfortable');
    setAttr('data-ft-bg-fill', ap.backgroundFill || 'paper', 'paper');
    setAttr('data-ft-topbar-style', ap.topbarStyle || 'flat', 'elevated');
    setAttr('data-ft-footer-style', ap.footerStyle || 'visible', 'visible');
    setAttr('data-ft-autohide', ap.autoHide || 'fade', 'off');
    setAttr('data-ft-result', ap.resultChrome || 'framed', 'framed');
    if (ap.monochromeChrome) {
      root.setAttribute('data-ft-monochrome', 'on');
    } else {
      root.removeAttribute('data-ft-monochrome');
    }
    // Borders — DEFAULT_APPEARANCE.borders === 'soft'; 'default' is the
    // attr-absent base. See src/app/borders-applier.tsx.
    var borders = ap.borders || 'soft';
    if (borders !== 'default') {
      root.setAttribute('data-ft-borders', String(borders));
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
