import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { resolveEligibleTags } from "@/server/resolve-tags";
import {
  setTagsInputSchema,
  type SetTagsInput,
  type SetTagsOutput,
  updateUsernameInputSchema,
  type UpdateUsernameInput,
  type UpdateUsernameOutput,
  USERNAME_REGEX,
} from "@/types/profile";
import type { UserTagId } from "@/types/user-tag";

/** Per-user record of the last successful username update. Strict
 *  1/hour window applies — but only successful updates consume the
 *  budget so a user can recover from a typo without being locked out.
 *  In-memory, per process; acceptable for one Vercel function and
 *  swappable for Redis later. */
const lastUpdateAtMs = new Map<string, number>();
const ONE_HOUR_MS = 60 * 60 * 1_000;

// Exposed for tests.
export function _resetUsernameWindow(): void {
  lastUpdateAtMs.clear();
}

/** Update the caller's Clerk username.
 *
 *  Rules, in order:
 *    1. Auth (`requireAuth`) — must be signed in.
 *    2. Zod regex — only `a-zA-Z_`, length 2–32 (USERNAME_REGEX in
 *       @/types/profile).
 *    3. No-op short-circuit — if the new value equals the current
 *       one (case-insensitive), return without writing or consuming
 *       the rate budget.
 *    4. 1/hour rate limit (per user) — only consumed by successful
 *       writes so a typo doesn't lock the user out.
 *    5. Uniqueness — Clerk's getUserList lookup, returning CONFLICT
 *       on collision (cleaner than catching Clerk's 422).
 *    6. Write to Clerk; record `lastUpdateAtMs` on success.
 *
 *  Defensive Clerk-side update errors are mapped to CONFLICT because
 *  the most likely failure after our pre-check is a TOCTOU collision. */
const updateUsername = defineRoute<UpdateUsernameInput, UpdateUsernameOutput>({
  input: updateUsernameInputSchema,
  // `requireAuth` lives on the namespace below — no need to re-list it
  // here. The route-internal 1/hour budget keys on `meta.userId` which
  // the namespace middleware populates.
  handler: async ({ input, meta, log }) => {
    const userId = meta.userId as string;
    const next = input.username.trim();

    if (!USERNAME_REGEX.test(next)) {
      // Belt and braces — Zod already enforces, but keeping the gate
      // here means future schema changes can't silently widen the
      // accepted character set.
      throw new BackendError(
        400,
        "VALIDATION",
        "Username can only contain letters and underscores.",
      );
    }

    const client = await clerkClient();
    const me = await client.users.getUser(userId);

    if (me.username && me.username.toLowerCase() === next.toLowerCase()) {
      return { username: me.username };
    }

    // Rate window check — runs *after* validation + no-op so failed
    // attempts don't consume the budget. The check is keyed on the
    // Clerk user id and stored in-memory; restart of the process
    // resets all users' windows, which is acceptable for a defence-in-
    // depth limit (Clerk itself rejects abusive write traffic).
    const last = lastUpdateAtMs.get(userId);
    if (last != null) {
      const elapsed = Date.now() - last;
      if (elapsed < ONE_HOUR_MS) {
        const retryAfterMs = ONE_HOUR_MS - elapsed;
        const retryMin = Math.ceil(retryAfterMs / 60_000);
        throw new BackendError(
          429,
          "RATE_LIMITED",
          `You can change your username once per hour. Try again in ${retryMin} minute${retryMin === 1 ? "" : "s"}.`,
          { retryAfterMs },
        );
      }
    }

    // Clerk's username lookup is case-insensitive in practice. We
    // explicitly check "is there a *different* user holding this
    // username?" so the no-op above already handled the
    // same-user-same-name case.
    const existing = await client.users.getUserList({ username: [next] });
    const conflict = existing.data.find((u) => u.id !== userId);
    if (conflict) {
      throw new BackendError(
        409,
        "CONFLICT",
        "That username is already taken.",
      );
    }

    try {
      const updated = await client.users.updateUser(userId, { username: next });
      lastUpdateAtMs.set(userId, Date.now());
      log.info("username updated", { userId, username: next });
      return { username: updated.username ?? next };
    } catch (err) {
      log.warn("clerk username update failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new BackendError(
        409,
        "CONFLICT",
        "Couldn't claim that username — it may already be taken.",
      );
    }
  },
});

/** Update the caller's tag-display selection — which of their
 *  eligible identity tags they want shown beside their name.
 *
 *  Server validates the input against the caller's eligibility set
 *  (Clerk publicMetadata + OWNER allowlist) and stores the filtered
 *  selection inside the user-prefs blob under `selectedTags`.
 *  Display layers (history.summary, history.publicProfile,
 *  leaderboard.list) intersect this with eligibility at read time.
 *
 *  Idempotent — passing the same selection twice is a no-op write
 *  (last write wins). Passing a tag the user isn't eligible for
 *  silently drops it from the stored value rather than throwing,
 *  so stale client state doesn't 4xx the dialog. */
const setTags = defineRoute<SetTagsInput, SetTagsOutput>({
  input: setTagsInputSchema,
  handler: async ({ input, db, meta }) => {
    const userId = meta.userId as string;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const eligible = resolveEligibleTags({
      email: user.emailAddresses[0]?.emailAddress,
      publicMetadataTags: (user.publicMetadata as { tags?: unknown } | null)
        ?.tags,
    });
    const eligibleSet = new Set<UserTagId>(eligible);
    // Filter the input down to what's actually allowed. Dedupe via
    // the Set so {og, og} doesn't end up double-stored.
    const validated: UserTagId[] = [];
    const seen = new Set<UserTagId>();
    for (const t of input.tags) {
      if (!eligibleSet.has(t) || seen.has(t)) continue;
      seen.add(t);
      validated.push(t);
    }
    await db.userPrefs.merge(userId, { selectedTags: validated });
    return { tags: validated, eligibleTags: eligible };
  },
});

/** Profile namespace. The `updateUsername` route enforces its own
 *  1/hour per-user budget for successful writes (rate-limit by Clerk
 *  user id) — that's the rule the user cares about. The 20/min
 *  per-user middleware here is a separate guard against scripted
 *  *failed* attempts: someone hammering the route with bogus values
 *  to enumerate the no-op vs. conflict branches. Per-user keying via
 *  the auth middleware above; falls back to per-IP for unauth'd
 *  callers (which can't actually reach the handler since requireAuth
 *  401s first). */
export const profile = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 20, windowMs: 60_000 })],
  routes: { updateUsername, setTags },
});
