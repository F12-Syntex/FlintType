import { z } from "zod";

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
