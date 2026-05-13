import { z } from "zod";
import { USER_TAG_IDS, type UserTagId } from "./user-tag";

/** Username rules: only letters (upper/lower) and underscore. No
 *  digits, no hyphens, no dots. Length 2–32. Anything outside this
 *  set is rejected before the Clerk write — the regex doubles as the
 *  user-facing error string. */
export const USERNAME_REGEX = /^[a-zA-Z_]+$/;

export const updateUsernameInputSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters.")
    .max(32, "Username must be 32 characters or fewer.")
    .regex(
      USERNAME_REGEX,
      "Username can only contain letters and underscores.",
    ),
});
export type UpdateUsernameInput = z.infer<typeof updateUsernameInputSchema>;

export type UpdateUsernameOutput = {
  username: string;
};

/** Selection of identity tags the user wants displayed beside their
 *  name. The server filters this against the caller's *eligibility*
 *  before storing — passing a tag you can't display is silently
 *  dropped, not rejected, so the route stays idempotent under stale
 *  client state. Empty array means "show no tags" (opt-out); a
 *  never-set selection is treated as "show all eligible" by the
 *  display layer so existing users don't lose their tags overnight. */
export const setTagsInputSchema = z.object({
  tags: z.array(z.enum(USER_TAG_IDS)).max(USER_TAG_IDS.length),
});
export type SetTagsInput = z.infer<typeof setTagsInputSchema>;

export type SetTagsOutput = {
  /** The post-validation selection — input filtered down to tags the
   *  caller is actually eligible to display. */
  tags: UserTagId[];
  /** The caller's current eligibility set, returned so the client can
   *  refresh its UI without a second round-trip. */
  eligibleTags: UserTagId[];
};
