import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  type GetUserPrefsOutput,
  type SetUserPrefsInput,
  type SetUserPrefsOutput,
  setUserPrefsInputSchema,
} from "@/types/user-prefs";

const get = defineRoute<void, GetUserPrefsOutput>({
  handler: async ({ db, meta }) => {
    return db.userPrefs.get(meta.userId as string);
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
