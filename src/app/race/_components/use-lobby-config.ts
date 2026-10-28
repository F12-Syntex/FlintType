"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  DEFAULT_LOBBY_CONFIG,
  LOBBY_CONFIG_STORAGE_KEY,
  loadLobbyConfig,
  type LobbyConfig,
} from "./lobby-config";

/** The saved private-lobby config, per browser. Hydrates from
 *  localStorage after mount (so the server-rendered markup, always the
 *  default, matches the first client render), then persists every later
 *  change. Owned by the launcher so its summary line and the gear's
 *  editor read the same value. */
export function useLobbyConfig(): [LobbyConfig, Dispatch<SetStateAction<LobbyConfig>>] {
  const [config, setConfig] = useState<LobbyConfig>(DEFAULT_LOBBY_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from localStorage, which isn't readable during SSR
    setConfig(loadLobbyConfig());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LOBBY_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Private mode / blocked storage: the config just won't persist
      // across reloads. Creation still works from in-memory state.
    }
  }, [config, hydrated]);
  return [config, setConfig];
}
