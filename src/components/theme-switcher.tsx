'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  applyTheme,
  DEFAULT_THEME_ID,
  readStoredTheme,
  storeTheme,
  THEMES,
  type ThemeId,
} from '@/lib/themes';

const THEME_CHANGE_EVENT = 'theme-change';

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener(THEME_CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(THEME_CHANGE_EVENT, cb);
  };
}

export function ThemeSwitcher() {
  const theme = useSyncExternalStore(
    subscribe,
    () => readStoredTheme(),
    () => DEFAULT_THEME_ID,
  );

  // Defense in depth: keep the <html> class in sync with the stored value.
  // The bootstrap script in <head> handles the initial paint; this covers
  // remounts, HMR, and cross-tab storage events.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function onChange(next: ThemeId) {
    applyTheme(next);
    storeTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <select
      aria-label="Theme"
      value={theme}
      onChange={(e) => onChange(e.target.value as ThemeId)}
      suppressHydrationWarning
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
    >
      {THEMES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
