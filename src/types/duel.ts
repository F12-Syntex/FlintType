import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** Create a duel from a just-finished run. The challenger's client
 *  posts the exact passage + their result + per-second WPM trace; the
 *  opponent will later type the same words against that ghost. */
export const createDuelInputSchema = z.object({
  opponentId: z.string().min(1).max(64),
  /** The passage, one word per element. Bounded so a client can't post
   *  an unbounded blob. */
  words: z.array(z.string().min(1).max(80)).min(1).max(300),
  mode: z.string().min(1).max(40),
  durationOrWordCount: z.number().int().min(1).max(100_000),
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  /** Per-second WPM samples (capped ~5 min). Optional — without it the
   *  opponent races with no ghost. */
  wpmHistory: z.array(z.number().min(0).max(1_000)).max(600).optional(),
});
export type CreateDuelInput = z.infer<typeof createDuelInputSchema>;
export type CreateDuelOutput = { id: string };

export const duelIdSchema = z.object({ id: z.string().min(1).max(64) });
export type DuelIdInput = z.infer<typeof duelIdSchema>;

export const submitDuelResultSchema = z.object({
  id: z.string().min(1).max(64),
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
});
export type SubmitDuelResultInput = z.infer<typeof submitDuelResultSchema>;

export type DuelParticipant = {
  userId: string;
  username: string | null;
  name: string;
  tags: UserTagId[];
};

export type DuelStatus = "pending" | "completed" | (string & {});

export type Duel = {
  id: string;
  challenger: DuelParticipant;
  opponent: DuelParticipant;
  /** The passage the opponent types. */
  words: string[];
  mode: string;
  durationOrWordCount: number;
  challengerWpm: number;
  challengerAccuracy: number;
  /** Per-second WPM trace driving the ghost; null when none captured. */
  challengerWpmHistory: number[] | null;
  status: DuelStatus;
  opponentWpm: number | null;
  opponentAccuracy: number | null;
  createdAtMs: number;
  completedAtMs: number | null;
};

export type GetDuelOutput = Duel;
export type SubmitDuelResultOutput = Duel;
export type ListDuelsOutput = { incoming: Duel[]; outgoing: Duel[] };
