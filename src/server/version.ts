import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/** Read the project's VERSION file at request time. Server-only — calls
 *  fs sync, so it must never reach the client bundle.
 *
 *  Server Components re-render on each navigation, so an editor-side bump
 *  to VERSION is reflected the next time the user navigates without
 *  needing a dev-server restart.
 *
 *  Falls back to the build-time NEXT_PUBLIC_APP_VERSION env var (set in
 *  next.config.ts) if the disk read fails — e.g. on a hosting platform
 *  that strips non-bundled files. */
export function getAppVersion(): string {
  try {
    return readFileSync(
      path.join(process.cwd(), "VERSION"),
      "utf-8",
    ).trim();
  } catch {
    return process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  }
}
