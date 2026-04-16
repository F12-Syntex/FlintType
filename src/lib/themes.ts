/**
 * Theme registry. Each theme is a CSS class in src/app/themes.css;
 * applying one means setting `theme-<id>` on <html>. The `default`
 * theme uses :root / .dark from globals.css and needs no class.
 *
 * Sources: community themes from https://tweakcn.com.
 */

export type Theme = {
  id: string;
  label: string;
  /** One-line credit / provenance — shown nowhere, kept for future UIs. */
  credit?: string;
};

export const THEMES: readonly Theme[] = [
  { id: 'default', label: 'Default', credit: 'shadcn base-nova' },
  { id: 'claude', label: 'Claude', credit: 'tweakcn.com/r/themes/claude' },
  { id: 'supabase', label: 'Supabase', credit: 'tweakcn.com/r/themes/supabase' },
  { id: 't3-chat', label: 'T3 Chat', credit: 'tweakcn.com/r/themes/t3-chat' },
  { id: 'mocha-mousse', label: 'Mocha Mousse', credit: 'tweakcn.com/r/themes/mocha-mousse' },
  { id: 'caffeine', label: 'Caffeine', credit: 'tweakcn.com/r/themes/caffeine' },
  { id: 'amethyst-haze', label: 'Amethyst Haze', credit: 'tweakcn.com/r/themes/amethyst-haze' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME_ID: ThemeId = 'default';
export const THEME_STORAGE_KEY = 'theme';

function isValidThemeId(v: string | null): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

/**
 * Applies a theme to <html> by removing any existing `theme-*` class
 * and adding the new one. The `default` theme is represented by the
 * absence of any theme class.
 */
export function applyTheme(id: ThemeId, root: HTMLElement = document.documentElement): void {
  for (const cls of Array.from(root.classList)) {
    if (cls.startsWith('theme-')) root.classList.remove(cls);
  }
  if (id !== 'default') root.classList.add(`theme-${id}`);
}

export function readStoredTheme(storage: Storage = window.localStorage): ThemeId {
  const raw = storage.getItem(THEME_STORAGE_KEY);
  return isValidThemeId(raw) ? raw : DEFAULT_THEME_ID;
}

export function storeTheme(id: ThemeId, storage: Storage = window.localStorage): void {
  storage.setItem(THEME_STORAGE_KEY, id);
}

/**
 * Script body for an inline <script> tag in <head>. Applies the stored
 * theme before React hydrates to prevent a flash of the default theme.
 * Keep in sync with {@link applyTheme} and {@link THEME_STORAGE_KEY}.
 */
export const THEME_BOOTSTRAP_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='${DEFAULT_THEME_ID}')document.documentElement.classList.add('theme-'+t);}catch(e){}`;
