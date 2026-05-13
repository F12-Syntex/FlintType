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

const set = defineRoute<SetUserPrefsInput, SetUserPrefsOutput>({
  input: setUserPrefsInputSchema,
  handler: async ({ db, meta, input }) => {
    await db.userPrefs.set(meta.userId as string, input.data);
    return input.data;
  },
});

/** 120/min covers a heavy customise session (the page debounces
 *  writes per setting, so changing 5 chips fast is still <10 writes
 *  per second). Anything beyond that is automated and worth slowing. */
export const prefs = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { get, set },
});
