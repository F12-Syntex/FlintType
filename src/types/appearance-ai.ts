import { z } from "zod";

/** A compact snapshot of the user's *current* settings, sent with the
 *  request so the model can resolve abstract / relative asks ("warmer",
 *  "a bit bigger", "match the accent") against real values, and output
 *  only the delta. Loose records — the server reads known keys only and
 *  re-validates everything downstream. */
export const aiCurrentStateSchema = z
  .object({
    theme: z.record(z.string(), z.string().max(80)).optional(),
    appearance: z
      .record(
        z.string(),
        z.union([z.string().max(80), z.number(), z.boolean()]),
      )
      .optional(),
    background: z
      .record(z.string(), z.union([z.string().max(2048), z.number()]))
      .optional(),
  })
  .optional();
export type AiCurrentState = z.infer<typeof aiCurrentStateSchema>;

/** Natural-language request the user types into the AI settings bar
 *  ("light green background, big fancy serif, fatter caret"). Capped so a
 *  pasted essay can't blow up the LLM call. `current` carries the live
 *  settings so the model can reason relatively and return only changes. */
export const aiSuggestInputSchema = z.object({
  prompt: z.string().min(1).max(500),
  current: aiCurrentStateSchema,
});
export type AiSuggestInput = z.infer<typeof aiSuggestInputSchema>;

/** One human-readable line in the "here's what I changed" list. */
export type AiChange = { label: string; value: string };

/** The sanitized, server-whitelisted set of changes the client applies.
 *  Every key/value here has already been validated against the known
 *  theme vars / appearance enums / background fields — the client may
 *  apply it directly (it still maps through the typed store setters).
 *
 *  - `theme`      — CSS custom-property overrides (var name → value)
 *  - `appearance` — a curated subset of AppearancePrefs keys
 *  - `background` — a subset of BackgroundPrefs keys */
export type AppearancePatch = {
  theme: Record<string, string>;
  appearance: Record<string, string | number | boolean>;
  background: Record<string, string | number>;
};

export type AiSuggestOutput = {
  /** One-line plain-language summary of the proposed look. */
  summary: string;
  /** Display rows for the suggestion card. */
  changes: AiChange[];
  /** The validated patch the client applies on Accept (and previews). */
  patch: AppearancePatch;
};

/** True when the patch carries no applicable change — the UI shows a
 *  "couldn't map that to a setting" state instead of an empty preview. */
export function isEmptyPatch(patch: AppearancePatch): boolean {
  return (
    Object.keys(patch.theme).length === 0 &&
    Object.keys(patch.appearance).length === 0 &&
    Object.keys(patch.background).length === 0
  );
}
