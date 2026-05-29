import { z } from "zod";

/** Natural-language request the user types into the AI settings bar
 *  ("light green background, big fancy serif, fatter caret"). Capped so a
 *  pasted essay can't blow up the LLM call. */
export const aiSuggestInputSchema = z.object({
  prompt: z.string().min(1).max(500),
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
