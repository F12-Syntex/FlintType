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
 *    - src/app/appearance-applier.tsx (reads HTML_ATTR_RULES below)
 *    - src/app/borders-applier.tsx
 *    - src/lib/apply-theme-overrides.tsx (theme CSS-var overrides)
 *    - src/lib/themes/use-palette.tsx (palette.varsLight/varsDark + applyTheme)
 *    - src/lib/themes/palette-fork.ts (custom+base override layering)
 *    - src/lib/themes/registry.ts (CUSTOM_THEME_ID — hardcoded as "custom" below)
 *    - src/app/_components/discord-banner.tsx (banners.discordDismissed) */

/** One appearance pref mirrored onto a `<html data-ft-…>` attribute.
 *  The single table both the pre-paint script below and
 *  `<AppearanceApplier>` read, so the two can never disagree.
 *
 *   - `enum`:     the value is written as-is unless it equals `fallback`
 *                 (the look the CSS gives with no attribute at all).
 *   - `flag-on`:  a default-off boolean; `true` writes `"on"`.
 *   - `flag-off`: a default-on boolean; `false` writes `"off"`. */
export type HtmlAttrRule =
  | { attr: string; key: string; kind: "enum"; fallback: string }
  | { attr: string; key: string; kind: "flag-on" }
  | { attr: string; key: string; kind: "flag-off" };

export const HTML_ATTR_RULES: readonly HtmlAttrRule[] = [
  // Surface + chrome (ui-law §15).
  { attr: "data-ft-cards", key: "cardSurfaces", kind: "enum", fallback: "solid" },
  { attr: "data-ft-dividers", key: "dividers", kind: "enum", fallback: "hairline" },
  { attr: "data-ft-padding", key: "pagePadding", kind: "enum", fallback: "comfortable" },
  { attr: "data-ft-bg-fill", key: "backgroundFill", kind: "enum", fallback: "paper" },
  { attr: "data-ft-topbar-style", key: "topbarStyle", kind: "enum", fallback: "elevated" },
  { attr: "data-ft-footer-style", key: "footerStyle", kind: "enum", fallback: "visible" },
  { attr: "data-ft-autohide", key: "autoHide", kind: "enum", fallback: "off" },
  { attr: "data-ft-result", key: "resultChrome", kind: "enum", fallback: "framed" },
  { attr: "data-ft-monochrome", key: "monochromeChrome", kind: "flag-on" },
  // Style (ui-law §21).
  { attr: "data-ft-controls", key: "controlShape", kind: "enum", fallback: "pill" },
  { attr: "data-ft-depth", key: "depth", kind: "enum", fallback: "soft" },
  { attr: "data-ft-glow", key: "buttonGlow", kind: "flag-off" },
  { attr: "data-ft-aura", key: "pageAura", kind: "flag-off" },
  { attr: "data-ft-ui-font", key: "uiFont", kind: "enum", fallback: "sans" },
  { attr: "data-ft-ui-scale", key: "uiScale", kind: "enum", fallback: "default" },
];

/** The attribute value one rule writes for an appearance blob, or
 *  `null` to remove it. Unknown / missing values fall back to "no
 *  attribute" so a corrupt blob never paints a half-state. */
export function htmlAttrValue(
  rule: HtmlAttrRule,
  appearance: Record<string, unknown>,
): string | null {
  const v = appearance[rule.key];
  if (rule.kind === "flag-on") return v === true ? "on" : null;
  if (rule.kind === "flag-off") return v === false ? "off" : null;
  return typeof v === "string" && v !== "" && v !== rule.fallback ? v : null;
}

/** Every mirrored attribute for an appearance blob (`null` = remove). */
export function htmlAttrsFor(
  appearance: Record<string, unknown>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const rule of HTML_ATTR_RULES) {
    out[rule.attr] = htmlAttrValue(rule, appearance);
  }
  return out;
}

export const PREFS_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var raw = window.localStorage.getItem('flinttype:prefs:v1');
    if (!raw) return;
    var blob = JSON.parse(raw);
    if (!blob || typeof blob !== 'object') return;
    var root = document.documentElement;

    // Appearance: data-ft-* attrs that drive the global CSS cascade.
    // Same table + rules as htmlAttrValue() above, which
    // src/app/appearance-applier.tsx uses after hydration.
    var ap = blob.appearance;
    if (ap && typeof ap === 'object') {
      var rules = ${JSON.stringify(HTML_ATTR_RULES)};
      for (var ri = 0; ri < rules.length; ri++) {
        var rule = rules[ri];
        var rv = ap[rule.key];
        var out = null;
        if (rule.kind === 'flag-on') {
          out = rv === true ? 'on' : null;
        } else if (rule.kind === 'flag-off') {
          out = rv === false ? 'off' : null;
        } else if (typeof rv === 'string' && rv !== '' && rv !== rule.fallback) {
          out = rv;
        }
        if (out === null) root.removeAttribute(rule.attr);
        else root.setAttribute(rule.attr, out);
      }
      // Borders — see src/app/borders-applier.tsx
      if (ap.borders && ap.borders !== 'default') {
        root.setAttribute('data-ft-borders', String(ap.borders));
      } else {
        root.removeAttribute('data-ft-borders');
      }
    }

    // Named palette: paint the active community palette's resolved
    // cssVars before first paint, so it doesn't flash the default
    // coral/paper for the first frames (ui-law §9.3). Mirrors applyTheme
    // in src/lib/themes/use-palette.tsx. The mode is resolved the same
    // way next-themes does (storageKey 'theme', defaultTheme 'system',
    // enableSystem) since this runs before next-themes sets the dark
    // class. Applied BEFORE the theme block so custom per-var overrides
    // still layer on top.
    var palette = blob.palette;
    if (palette && typeof palette === 'object') {
      var mode = 'light';
      try {
        var stored = window.localStorage.getItem('theme');
        if (stored === 'dark') {
          mode = 'dark';
        } else if (
          stored !== 'light' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          mode = 'dark';
        }
      } catch (_m) {
        /* matchMedia / storage unavailable — default to light */
      }
      var pvars = mode === 'dark' ? palette.varsDark : palette.varsLight;
      if (pvars && typeof pvars === 'object') {
        for (var pk in pvars) {
          if (!Object.prototype.hasOwnProperty.call(pvars, pk)) continue;
          var pv = pvars[pk];
          if (typeof pv !== 'string' || !pv) continue;
          if (pk.charAt(0) !== '-' || pk.charAt(1) !== '-') continue;
          root.style.setProperty(pk, pv);
        }
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
      var cmode = 'light';
      try {
        var cstored = window.localStorage.getItem('theme');
        if (cstored === 'dark') cmode = 'dark';
        else if (cstored !== 'light' &&
                 window.matchMedia('(prefers-color-scheme: dark)').matches) {
          cmode = 'dark';
        }
      } catch (_m) { /* keep light */ }
      var baseVars = cmode === 'dark' ? pal.base.dark : pal.base.light;
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
