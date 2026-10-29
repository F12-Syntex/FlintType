import { BackendError } from "@/lib/errors";
import { errorCodeLine, OFFLINE_LINE, RATE_LIMITED_LINE, SIGN_IN_LINE } from "./insights-copy";

/** Why the overview failed to load (spec-40 §2 error mapping). Only the
 *  error code crosses into the UI, never a server message. A failure
 *  that isn't a BackendError (offline, a dropped connection) has no
 *  code. */
export type LoadError =
  | { kind: "signIn" }
  | { kind: "rateLimited" }
  | { kind: "other"; code: string | null };

export function toLoadError(err: unknown): LoadError {
  if (err instanceof BackendError) {
    if (err.code === "UNAUTHORIZED") return { kind: "signIn" };
    if (err.code === "RATE_LIMITED") return { kind: "rateLimited" };
    return { kind: "other", code: err.code };
  }
  return { kind: "other", code: null };
}

/** The one line under an error's title, the same on the full-page card
 *  and the inline line over a failed bucket switch. */
export function loadErrorLine(error: LoadError): string {
  if (error.kind === "signIn") return SIGN_IN_LINE;
  if (error.kind === "rateLimited") return RATE_LIMITED_LINE;
  return error.code ? errorCodeLine(error.code) : OFFLINE_LINE;
}
