import { z } from "zod";

/** The wire-side blob is intentionally permissive — slices are owned
 *  by their respective hooks (caret-settings, behaviour-prefs, etc.)
 *  and the server stores them opaquely. Adding a new pref slice on
 *  the client doesn't require a backend change. */
export const userPrefsBlobSchema = z.record(z.string(), z.unknown());
export type UserPrefsBlob = z.infer<typeof userPrefsBlobSchema>;

export const setUserPrefsInputSchema = z.object({
  data: userPrefsBlobSchema,
});
export type SetUserPrefsInput = z.infer<typeof setUserPrefsInputSchema>;

export type GetUserPrefsOutput = UserPrefsBlob;
export type SetUserPrefsOutput = UserPrefsBlob;
