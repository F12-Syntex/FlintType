// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./index', () => ({
  getLocalDatabase: vi.fn(),
}));

import { getLocalDatabase, type LocalDatabase } from './index';
import { useLocalDb } from './hook';

const mockGetLocalDatabase = vi.mocked(getLocalDatabase);

function fakeDb(): LocalDatabase {
  return {
    notes: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    } as unknown as LocalDatabase['notes'],
  };
}

beforeEach(() => {
  mockGetLocalDatabase.mockReset();
});

describe('useLocalDb', () => {
  it('returns null on first render', () => {
    mockGetLocalDatabase.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLocalDb());
    expect(result.current).toBeNull();
  });

  it('resolves to the database once getLocalDatabase resolves', async () => {
    const db = fakeDb();
    mockGetLocalDatabase.mockResolvedValue(db);
    const { result } = renderHook(() => useLocalDb());
    await waitFor(() => expect(result.current).toBe(db));
  });

  it('does not setDb after unmount (cancel guard via the active flag)', async () => {
    let resolve!: (db: LocalDatabase) => void;
    mockGetLocalDatabase.mockReturnValue(
      new Promise<LocalDatabase>((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useLocalDb());
    expect(result.current).toBeNull();
    unmount();
    await act(async () => {
      resolve(fakeDb());
    });
    expect(result.current).toBeNull();
  });
});
