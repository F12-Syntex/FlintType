import { z } from "zod";

/** Race modes the client can request. Keeps this list aligned with
 *  `src/app/race/_components/race-data.ts` — the server only validates
 *  that the requested mode is in the union; the client picks display
 *  data + bot profiles. */
export const RACE_MODE_IDS = ["1v3", "1v1", "sprint", "endurance", "burst"] as const;
export type RaceModeId = (typeof RACE_MODE_IDS)[number];

/** Lifecycle of a server-authoritative race room.
 *    matching   — 5s window for real players to arrive; bots fill in
 *                 every ~1s if seats stay open
 *    lobby      — locked roster; brief breath before countdown
 *    countdown  — fixed 3s, no input accepted, no words revealed
 *    racing     — input flows, server broadcasts progress at 10Hz
 *    finished   — every racer crossed; final placements assigned */
export type RacePhase =
  | "matching"
  | "lobby"
  | "countdown"
  | "racing"
  | "finished";

export type RaceRoomKind = "matchmaking" | "challenge";

/** Wire shape of a single racer in a snapshot. `progressChars` is
 *  the racer's cursor position in the passage (in chars, including
 *  spaces between completed words). Letter-by-letter live sync rides
 *  on this single integer — every keystroke from a real player and
 *  every bot tick on the server moves it forward. */
export type RoomRacer = {
  id: string;
  name: string;
  /** Short geo flag emoji for bots; "—" for real players (we don't
   *  know their location and don't want to guess). */
  flag: string;
  /** Tier/badge label (GRANDMASTER, EXPERT, ADEPT, GUEST, RACER). */
  badge: string;
  isBot: boolean;
  /** Challenge rooms only: marks the player who created the room and
   *  is allowed to press Start. */
  isHost: boolean;
  joinedAt: number;
  progressChars: number;
  wpm: number;
  finishedAt: number | null;
  place: number | null;
};

/** Snapshot the client renders from. Server pushes this on every
 *  state change, capped at ~10 Hz when only ticks are arriving.
 *  `words` is intentionally absent during pre-race so no racer can
 *  see the passage before the countdown ends — fairness over
 *  bandwidth, the array adds maybe 200 bytes once it's included. */
export type RoomSnapshot = {
  roomId: string;
  /** Friendly slug for challenge rooms; null for matchmaking rooms
   *  (whose ids don't surface in any URL the user touches). */
  slug: string | null;
  kind: RaceRoomKind;
  modeId: RaceModeId;
  phase: RacePhase;
  /** Only revealed in racing/finished so racers can't pre-read. */
  words?: readonly string[];
  totalChars: number;
  /** Server's wall-clock at snapshot time. Clients compute deltas
   *  against this rather than local clock so a slow client tab doesn't
   *  drift relative to the countdown / race elapsed. */
  serverNowMs: number;
  /** Wall-clock when the matchmaking 5s window closes. Drives the
   *  in-passage poster's subtitle countdown on the client. */
  matchmakingEndsAt: number | null;
  countdownStartedAt: number | null;
  raceStartedAt: number | null;
  raceEndedAt: number | null;
  racers: readonly RoomRacer[];
};

/* ─── Request schemas ──────────────────────────────────────────── */

export const queueInputSchema = z.object({
  modeId: z.enum(RACE_MODE_IDS),
});
export type QueueInput = z.infer<typeof queueInputSchema>;

export type QueueOutput = {
  roomId: string;
  sessionToken: string;
  /** Passage words. Returned at join so the client's PracticeProvider
   *  can mount with them immediately — the UI still hides the text
   *  via the pre-race poster, but PracticeProvider needs them to
   *  drive cursor / error tracking the moment racing begins. */
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
};

export const keystrokeInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
  /** Char position in the passage. Capped server-side at totalChars. */
  progressChars: z.number().int().min(0),
  /** Live WPM mirrored from the client's practice calc. */
  wpm: z.number().int().min(0).max(500),
  /** True the moment the client's practice phase flips to `done`. */
  finished: z.boolean().optional(),
});
export type KeystrokeInput = z.infer<typeof keystrokeInputSchema>;

export type KeystrokeOutput = { ok: true };

export const leaveInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
});
export type LeaveInput = z.infer<typeof leaveInputSchema>;

export type LeaveOutput = { ok: true };

export const createChallengeInputSchema = z.object({
  modeId: z.enum(RACE_MODE_IDS),
});
export type CreateChallengeInput = z.infer<typeof createChallengeInputSchema>;

export type CreateChallengeOutput = {
  roomId: string;
  slug: string;
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
};

export const joinChallengeInputSchema = z.object({
  slug: z.string().min(1).max(64),
});
export type JoinChallengeInput = z.infer<typeof joinChallengeInputSchema>;

export type JoinChallengeOutput = {
  roomId: string;
  sessionToken: string;
  words: readonly string[];
  totalChars: number;
  modeId: RaceModeId;
};

export const startChallengeInputSchema = z.object({
  roomId: z.string().min(1),
  sessionToken: z.string().min(1),
});
export type StartChallengeInput = z.infer<typeof startChallengeInputSchema>;

export type StartChallengeOutput = { ok: true };
