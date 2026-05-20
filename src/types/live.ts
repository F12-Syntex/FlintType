import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** A broadcaster's latest live-practice state. Snapshotted ~every
 *  700ms while they practice on the live surface (if they've opted in
 *  to being spectated). Carries the passage so a spectator can render
 *  it read-only. */
export type LiveSnapshot = {
  words: string[];
  /** Cursor position (chars typed). */
  progressChars: number;
  totalChars: number;
  wpm: number;
  accuracy: number;
};

export const liveProgressInputSchema = z.object({
  words: z.array(z.string().min(1).max(80)).min(1).max(300),
  progressChars: z.number().int().min(0).max(100_000),
  totalChars: z.number().int().min(0).max(100_000),
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
});
export type LiveProgressInput = z.infer<typeof liveProgressInputSchema>;
/** `accepted` is false when the user hasn't opted in to being
 *  spectated — the broadcaster client stops pushing on a false. */
export type LiveProgressOutput = { accepted: boolean };

export const watchInputSchema = z.object({
  userId: z.string().min(1).max(64),
});
export type WatchInput = z.infer<typeof watchInputSchema>;

export type LiveSubject = {
  userId: string;
  username: string | null;
  name: string;
  tags: UserTagId[];
};

/** A poll result. `live: false` covers every "can't watch right now"
 *  case — not mutual friends, blocked, not opted in, or simply not
 *  currently practicing — without leaking which. */
export type WatchOutput =
  | { live: false }
  | {
      live: true;
      subject: LiveSubject;
      snapshot: LiveSnapshot;
      updatedAtMs: number;
    };

export type StopLiveOutput = { ok: true };
