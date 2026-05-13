import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "@/server/env";

/** Read the project's VERSION file at request time. Server-only — calls
 *  fs sync, so it must never reach the client bundle.
 *
 *  Server Components re-render on each navigation, so an editor-side bump
 *  to VERSION is reflected the next time the user navigates without
 *  needing a dev-server restart.
 *
 *  Falls back to the validated `env.NEXT_PUBLIC_APP_VERSION` (sourced
 *  from `next.config.ts` and parsed in `src/server/env.ts`) when the
 *  disk read fails — e.g. on a hosting platform that strips
 *  non-bundled files. The env table in `env.ts` is the single source
 *  of truth for the build-time version snapshot. */
export function getAppVersion(): string {
  try {
    return readFileSync(
      path.join(process.cwd(), "VERSION"),
      "utf-8",
    ).trim();
  } catch {
    return env.NEXT_PUBLIC_APP_VERSION;
  }
}
