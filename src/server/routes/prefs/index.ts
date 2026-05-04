import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
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

export const prefs = defineNamespace({
  middleware: [requireAuth],
  routes: { get, set },
});
