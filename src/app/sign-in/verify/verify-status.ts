import { EmailLinkErrorCode } from "@clerk/nextjs/errors";

/** What the magic-link landing page shows.
 *
 *  - `signed-in`: the link was opened in the browser that asked for it,
 *    so Clerk activated the new session here and is taking the user on.
 *  - `elsewhere`: the link checked out, but sign-in finishes in the tab
 *    that asked for it (another device or browser, or a step this page
 *    can't do). */
export type VerifyStatus =
  | { kind: "verifying" }
  | { kind: "signed-in" }
  | { kind: "elsewhere" }
  | { kind: "error"; message: string };

/** Clerk's load state, as `useClerk().status` reports it. */
type ClerkLoadStatus = "loading" | "ready" | "degraded" | "error";

/** A reason not to verify at all, or null to go ahead.
 *
 *  Clerk's link lands here with `__clerk_status` (or a ticket). A
 *  bookmark, a refresh or a mangled link has neither, and must not read
 *  as a success. If Clerk itself failed to load, the link can't be
 *  checked, so say so instead of spinning forever. */
export function precheck(
  search: string,
  clerkStatus: ClerkLoadStatus,
): VerifyStatus | null {
  const params = new URLSearchParams(search);
  if (!params.has("__clerk_status") && !params.has("__clerk_ticket")) {
    return {
      kind: "error",
      message: "This link is incomplete. Start signing in again to get a new one.",
    };
  }
  if (clerkStatus === "error") {
    return {
      kind: "error",
      message:
        "We couldn't reach the sign-in service. Check your connection, then open the link again.",
    };
  }
  return null;
}

/** The outcome once Clerk's handleEmailLinkVerification has resolved
 *  (a rejection is an error, see explainLinkError).
 *
 *  Clerk only signs the user in on this page when the session the link
 *  created (`__clerk_created_session`) belongs to this browser; it then
 *  makes it the active one. Any other resolution means the link was
 *  verified and the tab that asked for it carries on. */
export function statusAfterVerify(
  search: string,
  activeSessionId: string | null | undefined,
): VerifyStatus {
  const created = new URLSearchParams(search).get("__clerk_created_session");
  return created && activeSessionId === created
    ? { kind: "signed-in" }
    : { kind: "elsewhere" };
}

/** Plain copy for a rejected verification. */
export function explainLinkError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: string }).code
      : undefined;
  if (code === EmailLinkErrorCode.Expired)
    return "This link has expired. Request a new one.";
  if (code === EmailLinkErrorCode.Failed)
    return "Verification failed. Request a fresh sign-in link.";
  if (code === EmailLinkErrorCode.ClientMismatch)
    return "This link was opened on a different device or browser than the one that started sign-in. Open it on the original device, or start signing in again.";
  if (err && typeof err === "object" && "errors" in err) {
    const first = (err as { errors?: { longMessage?: string; message?: string }[] })
      .errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong verifying the link.";
}
