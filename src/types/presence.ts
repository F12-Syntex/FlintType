import { z } from "zod";

/** Coarse activity status. Open at the type level (a future status
 *  needs no migration), but the heartbeat input validates against this
 *  known set. */
export const presenceStatusSchema = z.enum([
  "online",
  "practicing",
  "racing",
  "idle",
]);
export type PresenceStatus = z.infer<typeof presenceStatusSchema>;

export const heartbeatInputSchema = z.object({
  status: presenceStatusSchema.optional(),
});
export type HeartbeatInput = z.infer<typeof heartbeatInputSchema>;
export type HeartbeatOutput = { ok: true };

export type PresenceEntry = {
  userId: string;
  /** lastSeenAt within the online window. */
  online: boolean;
  status: PresenceStatus | (string & {});
  lastSeenMs: number;
};

/** Presence for the people the caller follows (privacy: you only see
 *  the status of people you've chosen to follow). Absent users are
 *  offline by omission. */
export type PresenceListOutput = {
  entries: PresenceEntry[];
  /** The window (ms) used to derive `online`, so the client can render
   *  "active Ns ago" consistently. */
  windowMs: number;
};
