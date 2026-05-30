import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { openRouterJson } from "@/server/openrouter";
import {
  aiSuggestInputSchema,
  type AiSuggestInput,
  type AiSuggestOutput,
} from "@/types/appearance-ai";
import { APPEARANCE_AI_SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { sanitizeChanges, sanitizePatch, sanitizeSummary } from "./sanitize";
import { mergeBuckets, resolveTools } from "./tools";

/** Turn a natural-language look request into a validated appearance patch.
 *  The model gets the user's current settings (so it can reason relatively
 *  and reply with only a delta) and may invoke server-side tools
 *  (`palette` / `randomize`) which we resolve before sanitizing.
 *  requireAuth + a tight rate limit because each call hits a paid LLM. */
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

    // Resolve any server-side tools the model asked for, then let direct
    // model values win on key conflicts. The merged result is sanitized —
    // tools never widen the security boundary.
    const resolved = resolveTools(obj.tools, input.current);
    const merged = mergeBuckets(obj, resolved);
    const patch = sanitizePatch(merged);

    log.debug("ai-suggest patch built", {
      theme: Object.keys(patch.theme).length,
      appearance: Object.keys(patch.appearance).length,
      background: Object.keys(patch.background).length,
      tools: resolved.changes.length,
    });
    return {
      summary: sanitizeSummary(obj.summary),
      changes: sanitizeChanges([
        ...(Array.isArray(obj.changes) ? obj.changes : []),
        ...resolved.changes,
      ]),
      patch,
    };
  },
});

export const appearance = defineNamespace({
  routes: { aiSuggest },
});
