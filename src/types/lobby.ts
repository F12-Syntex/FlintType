import { z } from "zod";

/** Invite a friend into a private race lobby you've just opened. The
 *  client creates the lobby first (race.challenge.create, proxied to the
 *  authority) and passes the resulting `slug` here; this route validates
 *  the friendship and fires the `race_invite` notification. Room
 *  creation and the friend graph live in different places (authority vs
 *  app DB), so the client orchestrates the two calls. */
export const inviteToLobbyInputSchema = z.object({
  /** The friend to invite (their Clerk user id). */
  opponentId: z.string().min(1).max(64),
  /** Slug of the lobby the inviter just created. */
  slug: z.string().min(1).max(64),
});
export type InviteToLobbyInput = z.infer<typeof inviteToLobbyInputSchema>;
export type InviteToLobbyOutput = { ok: true };
