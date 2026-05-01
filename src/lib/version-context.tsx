"use client";

import { createContext, type ReactNode, useContext } from "react";
import { APP_VERSION } from "./version";

const VersionContext = createContext<string>(APP_VERSION);

/** Pass the request-time version (read server-side via
 *  `src/server/version.ts`) down through the client tree so any
 *  consumer rendered under this provider sees the live VERSION,
 *  bypassing the build-time env-var snapshot. */
export function VersionProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
  );
}

export function useAppVersion(): string {
  return useContext(VersionContext);
}

export function useAppVersionLabel(): string {
  return `v${useAppVersion()}`;
}
