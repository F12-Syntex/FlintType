import { BackendError } from "@/lib/errors";
import { env } from "@/server/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Fast, cheap, reliable JSON-mode model. Hardcoded (not an env var) so
 *  no build/infra config changes — the only knob is OPENROUTER_API_KEY,
 *  which already lives in env.ts. */
const MODEL = "openai/gpt-4o-mini";

/** Call OpenRouter in JSON mode and return the parsed object from the
 *  model's reply. Every failure (no key, network, non-2xx, empty,
 *  unparseable) surfaces as a `BackendError(500, "INTERNAL", …)` with a
 *  user-facing message — there's no AI-specific ErrorCode, and the
 *  caller (the route) just lets it bubble to the dispatcher. */
export async function openRouterJson(args: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<unknown> {
  const key = env.OPENROUTER_API_KEY;
  if (!key) {
    throw new BackendError(
      500,
      "INTERNAL",
      "AI suggestions aren't configured on this server.",
    );
  }

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "flinttype",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: args.maxTokens ?? 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
  } catch {
    throw new BackendError(500, "INTERNAL", "Couldn't reach the AI service.");
  }

  if (!res.ok) {
    throw new BackendError(500, "INTERNAL", `AI service error (${res.status}).`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new BackendError(500, "INTERNAL", "AI service returned no content.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new BackendError(
      500,
      "INTERNAL",
      "AI service returned malformed JSON.",
    );
  }
}
