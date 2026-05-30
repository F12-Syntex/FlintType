import type { AiCurrentState } from "@/types/appearance-ai";
import {
  AI_THEME_VARS,
  APPEARANCE_FIELDS,
  BEHAVIOUR_FIELDS,
} from "./sanitize";
import { describeCatalog } from "./options";

/** System prompt for the appearance AI assistant. The model never invents
 *  values — it picks an option **id** for each knob from a fixed catalog
 *  (so every suggestion is valid + on-brand, and setting many things at
 *  once is reliable). The catalog is injected from `options.ts` so the
 *  prompt can't drift from what's resolvable, and the server re-validates
 *  the resolved patch anyway. */
export const APPEARANCE_AI_SYSTEM_PROMPT = `You are the appearance assistant for flinttype, a typing-speed-test web app. The user describes, in plain language, how they want the test to look and behave. You translate that into a set of **fixed option choices**.

Reply with ONLY a JSON object, no prose:
{
  "summary": "one short sentence describing the result",
  "changes": [{ "label": "Surface", "value": "Sepia" }],
  "options": { "<knob>": "<option-id>", ... },
  "randomize": ["<knob>", ...]
}

HARD RULES:
- Every value in "options" MUST be exactly one of the listed ids for that knob. Never invent colours, numbers, fonts, or values. If nothing fits, omit the knob.
- Set as MANY knobs as the request implies, in one go. "cosy warm dark theme, big serif, relaxed and forgiving" → set surface, accent, font, fontSize, and the relevant behaviour knobs all at once.
- For relative / abstract asks ("warmer", "calmer", "darker", "stricter", "match the accent"), read the CURRENT settings provided and pick the nearest fitting option.
- Use "randomize" only for "surprise me" / "random" requests — list the knobs to randomise (the server picks a random valid option for each). You can combine "options" and "randomize".
- "changes" mirrors what you set, in plain words. Keep "summary" to one sentence.

KNOBS (pick one id per knob):
${describeCatalog()}

GUIDE:
- accent = the single highlight colour (caret, active state). surface = the whole page palette; the "(dark)" surfaces are dark themes. font / fontSize / radius / wordSpacing style the typing passage.
- tape, highlight, typedEffect, mistakes, caretIdle, cards, dividers, fill, padding, monochrome, smoothScroll, markIncomplete, lines, width = how the typing area looks.
- quickRestart, stopOnError, confidence, allowExtras, strictSpace, blindMode = how the test behaves.
- "minimal" / "clean" → cards transparent, dividers hidden, fill bare. "serif" / "elegant" → font serif or elegant. "forgiving" → stopOnError off, confidence off, allowExtras on. "hardcore" / "strict" → stopOnError on, strictSpace on, confidence all.`;

/** Filter an object to known keys (and only when present) so the prompt's
 *  current-state block stays compact. */
function pickKeys(
  obj: Record<string, unknown> | undefined,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!obj) return out;
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/** Build the user message: a compact snapshot of the current settings plus
 *  the request, so the model can reason relatively and pick the nearest
 *  option for "warmer" / "stricter" style asks. */
export function buildUserMessage(
  prompt: string,
  current: AiCurrentState | undefined,
): string {
  const snapshot = {
    theme: pickKeys(current?.theme, AI_THEME_VARS),
    appearance: pickKeys(current?.appearance, Object.keys(APPEARANCE_FIELDS)),
    behaviour: pickKeys(current?.behaviour, Object.keys(BEHAVIOUR_FIELDS)),
  };
  return `Current settings:\n${JSON.stringify(snapshot)}\n\nRequest: ${prompt}`;
}
