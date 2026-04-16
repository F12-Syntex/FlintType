// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyMode,
  applyTheme,
  DEFAULT_THEME_ID,
  MODE_STORAGE_KEY,
  readStoredMode,
  readStoredTheme,
  resolveMode,
  storeMode,
  storeTheme,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  THEMES,
} from './themes';

describe('THEMES registry', () => {
  it('contains default as the first entry', () => {
    expect(THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
  });

  it('has unique ids', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  it('adds theme-<id> class for non-default themes', () => {
    applyTheme('claude');
    expect(document.documentElement.classList.contains('theme-claude')).toBe(true);
  });

  it('removes any prior theme-* class before adding the new one', () => {
    applyTheme('claude');
    applyTheme('supabase');
    expect(document.documentElement.classList.contains('theme-claude')).toBe(false);
    expect(document.documentElement.classList.contains('theme-supabase')).toBe(true);
  });

  it('default theme clears any existing theme-* class and adds nothing', () => {
    applyTheme('claude');
    applyTheme('default');
    const classes = Array.from(document.documentElement.classList);
    expect(classes.some((c) => c.startsWith('theme-'))).toBe(false);
  });

  it('preserves unrelated classes like `dark`', () => {
    document.documentElement.classList.add('dark', 'h-full');
    applyTheme('claude');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('h-full')).toBe(true);
    expect(document.documentElement.classList.contains('theme-claude')).toBe(true);
  });
});

describe('readStoredTheme / storeTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default when nothing is stored', () => {
    expect(readStoredTheme()).toBe(DEFAULT_THEME_ID);
  });

  it('round-trips a valid theme id through storage', () => {
    storeTheme('supabase');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('supabase');
    expect(readStoredTheme()).toBe('supabase');
  });

  it('falls back to default for unknown stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'not-a-theme');
    expect(readStoredTheme()).toBe(DEFAULT_THEME_ID);
  });
});

describe('applyMode', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  it('adds the dark class when mode is dark', () => {
    applyMode('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class when mode is light', () => {
    document.documentElement.classList.add('dark');
    applyMode('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('preserves unrelated classes like theme-claude', () => {
    document.documentElement.classList.add('theme-claude');
    applyMode('dark');
    expect(document.documentElement.classList.contains('theme-claude')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('readStoredMode / storeMode / resolveMode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredMode()).toBeNull();
  });

  it('round-trips a valid mode through storage', () => {
    storeMode('dark');
    expect(readStoredMode()).toBe('dark');
    storeMode('light');
    expect(readStoredMode()).toBe('light');
  });

  it('returns null for invalid stored values', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'mauve');
    expect(readStoredMode()).toBeNull();
  });

  it('resolveMode passes through an explicit value', () => {
    expect(resolveMode('dark')).toBe('dark');
    expect(resolveMode('light')).toBe('light');
  });

  it('resolveMode(null) consults prefers-color-scheme', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
      matches: q === '(prefers-color-scheme: dark)',
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(resolveMode(null)).toBe('dark');
    spy.mockRestore();
  });
});

describe('THEME_BOOTSTRAP_SCRIPT', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  it('applies the stored theme when evaluated', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'claude');
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.classList.contains('theme-claude')).toBe(true);
  });

  it('does not add a theme class for default', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME_ID);
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    const classes = Array.from(document.documentElement.classList);
    expect(classes.some((c) => c.startsWith('theme-'))).toBe(false);
  });

  it('applies dark class when stored mode is dark', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'dark');
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does not apply dark when stored mode is light (even if system prefers dark)', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'light');
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
      matches: true,
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    spy.mockRestore();
  });

  it('falls back to system preference when no mode is stored', () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({
      matches: q === '(prefers-color-scheme: dark)',
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    new Function(THEME_BOOTSTRAP_SCRIPT)();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    spy.mockRestore();
  });
});
