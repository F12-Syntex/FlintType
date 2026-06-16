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

/** Partial save: `data` holds only the slices the client changed and
 *  is merged into the stored blob; `remove` lists slice keys the client
 *  deleted (reset flows). This is the flush path — wholesale `set`
 *  stays for flows that genuinely replace the client-owned blob. */
export const mergeUserPrefsInputSchema = z.object({
  data: userPrefsBlobSchema,
  remove: z.array(z.string().min(1).max(128)).max(64).optional(),
});
export type MergeUserPrefsInput = z.infer<typeof mergeUserPrefsInputSchema>;

export type GetUserPrefsOutput = UserPrefsBlob;
export type SetUserPrefsOutput = UserPrefsBlob;
export type MergeUserPrefsOutput = { ok: true };

/** Slices of the user_prefs blob that are written by SERVER routes
 *  (adapt.submit, profile.setTags, monkeytype.import/disconnect) — the
 *  client never owns them, so the prefs.set / prefs.merge handlers
 *  strip them from client input and preserve the stored values. Single
 *  source of truth: extend here when a new server-written slice lands. */
export const SERVER_OWNED_PREF_KEYS = [
  "adaptRecency",
  "adaptFingerMapHash",
  "selectedTags",
  "monkeytypeStats",
] as const;
export type ServerOwnedPrefKey = (typeof SERVER_OWNED_PREF_KEYS)[number];
