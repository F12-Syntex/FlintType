import { defineNamespace, defineRoute } from "@/server";
import { ensureUser } from "@/server/ensure-user";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  type GetUserPrefsOutput,
  type SetUserPrefsInput,
  type SetUserPrefsOutput,
  setUserPrefsInputSchema,
} from "@/types/user-prefs";

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

/** Top-level prefs-blob keys the SERVER owns — written only by trusted
 *  server events (the adapt model after a run, the tag-grant route), never
 *  by the client's UI. The client's wholesale `prefs.set` snapshot still
 *  carries whatever value it loaded for these, so without this guard a
 *  debounced client save could revert a server write that landed in
 *  between (FT-007 lost-update). We re-apply the stored values on top of
 *  the client blob so the client can never clobber them. */
const SERVER_OWNED_KEYS = [
  "adaptRecency",
  "adaptFingerMapHash",
  "selectedTags",
] as const;

const set = defineRoute<SetUserPrefsInput, SetUserPrefsOutput>({
  input: setUserPrefsInputSchema,
  handler: async ({ db, meta, input }) => {
    const userId = meta.userId as string;
    const current = await db.userPrefs.get(userId);
    const data: Record<string, unknown> = { ...input.data };
    for (const key of SERVER_OWNED_KEYS) {
      if (key in current) data[key] = current[key];
      else delete data[key];
    }
    await db.userPrefs.set(userId, data);
    return data;
  },
});

/** 120/min covers a heavy customise session (the page debounces
 *  writes per setting, so changing 5 chips fast is still <10 writes
 *  per second). Anything beyond that is automated and worth slowing. */
export const prefs = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { get, set },
});
