/** Pulls the most user-readable message out of a Clerk APIResponseError
 *  (`err.errors[0].longMessage`, which Clerk already writes for people),
 *  falling back to a plain Error's message. Null when there's nothing
 *  useful, so callers can supply their own fallback copy. */
export function extractClerkError(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  ) {
    const first = (err as { errors: { longMessage?: string; message?: string }[] })
      .errors[0];
    return first?.longMessage ?? first?.message ?? null;
  }
  if (err instanceof Error) return err.message;
  return null;
}
