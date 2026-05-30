import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { openRouterJson } from "@/server/openrouter";
import {
  aiSuggestInputSchema,
  type AiSuggestInput,
  type AiSuggestOutput,
} from "@/types/appearance-ai";
import { resolveAi } from "./options";
import { APPEARANCE_AI_SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { sanitizeChanges, sanitizePatch, sanitizeSummary } from "./sanitize";

/** Turn a natural-language look request into a validated appearance patch.
 *  The model picks option ids from the fixed catalog (`options.ts`); we
 *  resolve those to a concrete patch and re-sanitize it as a final
 *  boundary. The model gets the user's current settings so it can reason
 *  relatively ("warmer", "stricter"). requireAuth + a tight rate limit
 *  because each call hits a paid LLM. */
const aiSuggest = defineRoute<AiSuggestInput, AiSuggestOutput>({
  input: aiSuggestInputSchema,
  middleware: [requireAuth, rateLimit({ limit: 15, windowMs: 60_000 })],
  handler: async ({ input, log }) => {
    const raw = await openRouterJson({
      system: APPEARANCE_AI_SYSTEM_PROMPT,
      user: buildUserMessage(input.prompt, input.current),
    });
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;

    const { patch: resolvedPatch, changes: resolvedChanges } = resolveAi(obj);
    // Re-sanitize even though every value came from our own catalog — one
    // boundary for both the AI path and any future caller.
    const patch = sanitizePatch(resolvedPatch);

    log.debug("ai-suggest patch built", {
      theme: Object.keys(patch.theme).length,
      appearance: Object.keys(patch.appearance).length,
      behaviour: Object.keys(patch.behaviour).length,
    });
    return {
      summary: sanitizeSummary(obj.summary),
      changes: sanitizeChanges(
        resolvedChanges.length > 0
          ? resolvedChanges
          : Array.isArray(obj.changes)
            ? obj.changes
            : [],
      ),
      patch,
    };
  },
});

export const appearance = defineNamespace({
  routes: { aiSuggest },
});
