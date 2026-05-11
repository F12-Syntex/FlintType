import { z } from "zod";

/** /api/monkeytype/import input — the user's Ape Key (server-side
 *  read-only token they generate at monkeytype.com → Account Settings
 *  → Ape Keys). The key is used in-flight to fetch their results and
 *  is never persisted. */
export const monkeytypeImportInputSchema = z.object({
  apiKey: z.string().min(8).max(256),
});
export type MonkeytypeImportInput = z.infer<
  typeof monkeytypeImportInputSchema
>;

export type MonkeytypeImportOutput = {
  /** Number of MT results successfully inserted as flinttype tests. */
  imported: number;
  /** Results already present in the user's history (dedup by
   *  startedAt timestamp), so they were skipped to avoid duplicates. */
  skipped: number;
  /** Total results returned by MT for this Ape Key. */
  fetched: number;
};
