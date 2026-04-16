'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  applyMode,
  readStoredMode,
  resolveMode,
  storeMode,
  type Mode,
} from '@/lib/themes';

const MODE_CHANGE_EVENT = 'mode-change';

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  window.addEventListener(MODE_CHANGE_EVENT, cb);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(MODE_CHANGE_EVENT, cb);
    mql.removeEventListener('change', cb);
  };
}

export function ModeToggle() {
  const mode = useSyncExternalStore(
    subscribe,
    () => resolveMode(readStoredMode()),
    () => 'light' as Mode,
  );

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  function toggle() {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    applyMode(next);
    storeMode(next);
    window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      suppressHydrationWarning
    >
      {mode === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
