import { BackendError } from "@/lib/errors";

/** Why the profile snapshot failed to load. Copy lives in the UI; the
 *  only server detail kept is the error code, never the raw message
 *  (an INTERNAL message can leak server internals). */
export type ProfileLoadError =
  | { kind: "signIn" }
  | { kind: "notFound" }
  | { kind: "rateLimited" }
  | { kind: "other"; code: string | null };

export function toProfileLoadError(err: unknown): ProfileLoadError {
  if (err instanceof BackendError) {
    if (err.code === "UNAUTHORIZED") return { kind: "signIn" };
    if (err.code === "NOT_FOUND") return { kind: "notFound" };
    if (err.code === "RATE_LIMITED") return { kind: "rateLimited" };
    return { kind: "other", code: err.code };
  }
  return { kind: "other", code: null };
}
