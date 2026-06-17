import { defineNamespace, defineRoute } from "@/server";
import { ensureUser } from "@/server/ensure-user";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  type GetUserPrefsOutput,
  type MergeUserPrefsInput,
  type MergeUserPrefsOutput,
  SERVER_OWNED_PREF_KEYS,
  type SetUserPrefsInput,
  type SetUserPrefsOutput,
  type UserPrefsBlob,
  mergeUserPrefsInputSchema,
  setUserPrefsInputSchema,
} from "@/types/user-prefs";

/** Server-owned slices (adapt model state, selectedTags, monkeytype
 *  stats) are never client-writable — drop them from any client
 *  payload so a stale client snapshot can't revert what a server
 *  route just wrote (the user_prefs lost-update bug). */
function stripServerOwned(data: UserPrefsBlob): UserPrefsBlob {
  const out: UserPrefsBlob = { ...data };
  for (const key of SERVER_OWNED_PREF_KEYS) delete out[key];
  return out;
}

const get = defineRoute<void, GetUserPrefsOutput>({
  handler: async (ctx) => {
    // prefs.get fires on every authenticated page mount (via
    // useRemotePrefs). Piggy-back the OG-grant trigger here so a
    // new user gets their tag + welcome notification on their first
    // app load — not lazily on whichever future page happens to hit
    // history.summary. ensureUser is idempotent: the og_granted_at
    // flag is checked first, so steady-state cost is one SELECT.
    void ensureUser(ctx).catch(() => {
      // Failures already log inside ensureUser; swallow here so a
      // transient mirror outage never breaks prefs.get (which the
      // entire app waits on at mount).
    });
    return ctx.db.userPrefs.get(ctx.meta.userId as string);
  },
});

/** Wholesale replace of the CLIENT-owned blob. Server-owned slices
 *  are stripped from the input and the stored values preserved
 *  atomically — a client "reset all" / import must not wipe server
 *  state (adapt model, tags, MT import). */
const set = defineRoute<SetUserPrefsInput, SetUserPrefsOutput>({
  input: setUserPrefsInputSchema,
  handler: async ({ db, meta, input }) => {
    const data = stripServerOwned(input.data);
    await db.userPrefs.replacePreserving(
      meta.userId as string,
      data,
      SERVER_OWNED_PREF_KEYS,
    );
    return data;
  },
});

/** Per-slice merge — the client flush path. Only the dirty slices
 *  travel; removed slices come through `remove`. Server-owned keys
 *  are stripped from both so the client can never touch them. */
const merge = defineRoute<MergeUserPrefsInput, MergeUserPrefsOutput>({
  input: mergeUserPrefsInputSchema,
  handler: async ({ db, meta, input }) => {
    const data = stripServerOwned(input.data);
    const serverOwned = new Set<string>(SERVER_OWNED_PREF_KEYS);
    const remove = (input.remove ?? []).filter((k) => !serverOwned.has(k));
    if (Object.keys(data).length > 0 || remove.length > 0) {
      await db.userPrefs.merge(meta.userId as string, data, remove);
    }
    return { ok: true };
  },
});

/** 120/min covers a heavy customise session (the page debounces
 *  writes per setting, so changing 5 chips fast is still <10 writes
 *  per second). Anything beyond that is automated and worth slowing. */
export const prefs = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { get, set, merge },
});
