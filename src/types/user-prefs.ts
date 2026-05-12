import { z } from "zod";

/** Hard ceiling on the serialised blob size — every legitimate prefs
 *  snapshot today is well under 50 KB (the whole appearance + caret
 *  + behaviour + keymap + theme overrides + MT slice combined). 256
 *  KB leaves headroom for future slices without exposing the row to
 *  unbounded-write DoS (heap inflate during JSON.stringify, then a
 *  bloated JSONB write that fights vacuum). */
const MAX_PREFS_BLOB_BYTES = 256 * 1024;

/** The wire-side blob is intentionally permissive — slices are owned
 *  by their respective hooks (caret-settings, behaviour-prefs, etc.)
 *  and the server stores them opaquely. Adding a new pref slice on
 *  the client doesn't require a backend change. */
export const userPrefsBlobSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (obj) => {
      try {
        return JSON.stringify(obj).length <= MAX_PREFS_BLOB_BYTES;
      } catch {
        return false;
      }
    },
    {
      message: `Prefs blob exceeds ${MAX_PREFS_BLOB_BYTES} bytes`,
    },
  );
export type UserPrefsBlob = z.infer<typeof userPrefsBlobSchema>;

export const setUserPrefsInputSchema = z.object({
  data: userPrefsBlobSchema,
});
export type SetUserPrefsInput = z.infer<typeof setUserPrefsInputSchema>;

export type GetUserPrefsOutput = UserPrefsBlob;
export type SetUserPrefsOutput = UserPrefsBlob;
