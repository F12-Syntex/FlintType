import { z } from "zod";

/** /api/monkeytype/import input — the user's Ape Key (server-side
 *  read-only token they generate at monkeytype.com → Account Settings
 *  → Ape Keys). The key is used in-flight to fetch their results /
 *  PBs / stats and is never persisted. */
export const monkeytypeImportInputSchema = z.object({
  apiKey: z.string().min(8).max(256),
});
export type MonkeytypeImportInput = z.infer<
  typeof monkeytypeImportInputSchema
>;

export type MonkeytypeImportOutput = {
  /** Number of MT results successfully inserted as flinttype tests
   *  (capped at the last 10 per the user's import scope). */
  imported: number;
  /** Results already present in the user's history (dedup by
   *  startedAt timestamp), so they were skipped to avoid duplicates. */
  skipped: number;
  /** Total results returned by MT for this Ape Key. */
  fetched: number;
  /** Number of personal-best length cells stored from MT (across
   *  both time and words modes). */
  pbsImported: number;
  /** Lifetime stats snapshot pulled from MT. Surfaces in the
   *  profile alongside the local-derived totals. */
  stats: {
    completedTests?: number;
    startedTests?: number;
    timeTyping?: number;
  };
};

/** Snapshot stored in user_prefs.data.monkeytypeStats after a
 *  successful import. The profile reads this slice and merges it
 *  with locally-derived data — e.g. PBs are MAX(local, mt). */
export type MonkeytypeStatsSlice = {
  /** ms when the import ran. */
  importedAt: number;
  completedTests?: number;
  startedTests?: number;
  /** Lifetime time spent typing on MT, in seconds. */
  timeTyping?: number;
  pbs: {
    /** Keyed by length (e.g. "15", "30"). */
    time: Record<string, { wpm: number; acc: number }>;
    /** Keyed by length (e.g. "10", "25"). */
    words: Record<string, { wpm: number; acc: number }>;
  };
  /** AES-256-GCM encrypted Ape Key — server-encrypted at write
   *  with `API_KEY_ENC_SECRET`, decrypted only when re-importing.
   *  The DB never sees plaintext. Format defined in
   *  `src/server/api-key-crypto.ts`. */
  encryptedApiKey?: {
    v: 1;
    iv: string;
    tag: string;
    ct: string;
  };
};
