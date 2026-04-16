'use client';

import { useEffect, useState } from 'react';
import { getLocalDatabase, type LocalDatabase } from './index';

/**
 * React hook that yields the browser-local database. Returns `null` during
 * the first render while PGlite + OPFS/IDB initialize. Consumers must
 * handle the null state (loading indicator) before calling repo methods.
 */
export function useLocalDb(): LocalDatabase | null {
  const [db, setDb] = useState<LocalDatabase | null>(null);

  useEffect(() => {
    let active = true;
    getLocalDatabase().then((resolved) => {
      if (active) setDb(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  return db;
}
