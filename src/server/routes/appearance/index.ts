import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { openRouterJson } from "@/server/openrouter";
import {
  aiSuggestInputSchema,
  type AiSuggestInput,
  type AiSuggestOutput,
} from "@/types/appearance-ai";
import { APPEARANCE_AI_SYSTEM_PROMPT } from "./prompt";
import { sanitizeChanges, sanitizePatch, sanitizeSummary } from "./sanitize";

/** Turn a natural-language look request into a validated appearance patch.
 *  requireAuth + a tight rate limit because each call hits a paid LLM. */
const aiSuggest = defineRoute<AiSuggestInput, AiSuggestOutput>({
  input: aiSuggestInputSchema,
  middleware: [requireAuth, rateLimit({ limit: 15, windowMs: 60_000 })],
  handler: async ({ input, log }) => {
    const raw = await openRouterJson({
      system: APPEARANCE_AI_SYSTEM_PROMPT,
      user: input.prompt,
    });
    const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    const patch = sanitizePatch(obj);
    log.debug("ai-suggest patch built", {
      theme: Object.keys(patch.theme).length,
      appearance: Object.keys(patch.appearance).length,
      background: Object.keys(patch.background).length,
    });
    return {
      summary: sanitizeSummary(obj.summary),
      changes: sanitizeChanges(obj.changes),
      patch,
    };
  },
});

export const appearance = defineNamespace({
  routes: { aiSuggest },
});
