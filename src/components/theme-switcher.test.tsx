// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '@/lib/themes';
import { ThemeSwitcher } from './theme-switcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the default theme on first mount when nothing is stored', () => {
    render(<ThemeSwitcher />);
    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(select.value).toBe('default');
    expect(document.documentElement.classList.contains('theme-default')).toBe(false);
  });

  it('applies and persists the selected theme', () => {
    render(<ThemeSwitcher />);
    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'supabase' } });
    expect(select.value).toBe('supabase');
    expect(document.documentElement.classList.contains('theme-supabase')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('supabase');
  });

  it('restores a previously stored theme on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'claude');
    render(<ThemeSwitcher />);
    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    expect(select.value).toBe('claude');
    expect(document.documentElement.classList.contains('theme-claude')).toBe(true);
  });

  it('swapping themes removes the previous theme-* class', () => {
    render(<ThemeSwitcher />);
    const select = screen.getByLabelText('Theme') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'claude' } });
    fireEvent.change(select, { target: { value: 't3-chat' } });
    expect(document.documentElement.classList.contains('theme-claude')).toBe(false);
    expect(document.documentElement.classList.contains('theme-t3-chat')).toBe(true);
  });
});
