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
 *    - src/lib/themes/palette-fork.ts (custom+base override layering)
 *    - src/lib/themes/registry.ts (CUSTOM_THEME_ID — hardcoded as "custom" below)
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
    // Mirrors src/app/appearance-applier.tsx.
    var ap = blob.appearance;
    if (ap && typeof ap === 'object') {
      var setAttr = function (key, value, defaultValue) {
        if (value && value !== defaultValue) {
          root.setAttribute(key, String(value));
        } else {
          root.removeAttribute(key);
        }
      };
      setAttr('data-ft-cards', ap.cardSurfaces, 'solid');
      setAttr('data-ft-dividers', ap.dividers, 'hairline');
      setAttr('data-ft-padding', ap.pagePadding, 'comfortable');
      setAttr('data-ft-bg-fill', ap.backgroundFill, 'paper');
      setAttr('data-ft-topbar-style', ap.topbarStyle, 'elevated');
      setAttr('data-ft-footer-style', ap.footerStyle, 'visible');
      setAttr('data-ft-autohide', ap.autoHide, 'off');
      setAttr('data-ft-result', ap.resultChrome, 'framed');
      if (ap.monochromeChrome) {
        root.setAttribute('data-ft-monochrome', 'on');
      } else {
        root.removeAttribute('data-ft-monochrome');
      }
      // Borders — see src/app/borders-applier.tsx
      if (ap.borders && ap.borders !== 'default') {
        root.setAttribute('data-ft-borders', String(ap.borders));
      } else {
        root.removeAttribute('data-ft-borders');
      }
    }

    // Custom-fork base palette: when the user nudged a var while on a
    // named palette, the palette slice pins activeId 'custom' and keeps
    // a snapshot of the named palette's cssVars under base (see
    // src/lib/themes/palette-fork.ts). Paint it BEFORE blob.theme so
    // the per-var overrides win where names collide. Mode resolution
    // mirrors next-themes: localStorage 'theme' key, else system.
    var pal = blob.palette;
    if (pal && typeof pal === 'object' && pal.activeId === 'custom' &&
        pal.base && typeof pal.base === 'object') {
      var mode = 'light';
      try {
        var stored = window.localStorage.getItem('theme');
        if (stored === 'dark') mode = 'dark';
        else if (stored !== 'light' &&
                 window.matchMedia('(prefers-color-scheme: dark)').matches) {
          mode = 'dark';
        }
      } catch (_m) { /* keep light */ }
      var baseVars = mode === 'dark' ? pal.base.dark : pal.base.light;
      if (baseVars && typeof baseVars === 'object') {
        for (var bk in baseVars) {
          if (!Object.prototype.hasOwnProperty.call(baseVars, bk)) continue;
          var bv = baseVars[bk];
          if (typeof bv !== 'string' || !bv) continue;
          root.style.setProperty('--' + bk, bv);
        }
      }
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
