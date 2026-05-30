import { BackendError } from "@/lib/errors";
import { env } from "@/server/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Primary model. Hardcoded (not an env var) so no build/infra config
 *  changes — the only knob is OPENROUTER_API_KEY, which lives in env.ts. */
const MODEL = "openai/gpt-oss-120b:nitro";

/** OpenRouter tries these in order within a single call if the primary
 *  provider/model errors — a non-reasoning JSON model is a reliable
 *  backstop for the reasoning primary. */
const FALLBACK_MODELS = ["google/gemini-2.5-flash", "openai/gpt-4o-mini"];

/** Whole-request retries on top of OpenRouter's per-call fallback, for the
 *  stochastic "empty content" case (a reasoning model occasionally spends
 *  its budget thinking and returns no message). */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull a JSON value out of a model reply, tolerant of the ways models
 *  wrap it: `content` may be a string or an array of parts, may be fenced
 *  in ``` ```, or may carry stray prose around the object. Returns null
 *  when nothing parseable is found. */
export function extractJson(raw: unknown): unknown | null {
  let text: string;
  if (typeof raw === "string") {
    text = raw;
  } else if (Array.isArray(raw)) {
    text = raw
      .map((p) =>
        typeof p === "string"
          ? p
          : typeof (p as { text?: unknown })?.text === "string"
            ? (p as { text: string }).text
            : "",
      )
      .join("");
  } else {
    return null;
  }
  text = text.trim();
  if (!text) return null;

  const tryParse = (s: string): unknown | undefined => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };

  let v = tryParse(text);
  if (v !== undefined) return v;

  // Strip a leading ```json / ``` fence and a trailing ```.
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  v = tryParse(unfenced);
  if (v !== undefined) return v;

  // Last resort: slice the outermost { … } and parse that.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    v = tryParse(text.slice(start, end + 1));
    if (v !== undefined) return v;
  }
  return null;
}

type Attempt =
  | { ok: true; value: unknown }
  | { ok: false; retryable: boolean; status?: number };

async function callOnce(
  key: string,
  args: { system: string; user: string; maxTokens?: number },
): Promise<Attempt> {
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
        models: [MODEL, ...FALLBACK_MODELS],
        temperature: 0.3,
        // Reasoning models eat the token budget thinking; give the answer
        // room and keep reasoning low so `content` is never starved.
        max_tokens: args.maxTokens ?? 2048,
        reasoning: { effort: "low" },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
  } catch {
    return { ok: false, retryable: true };
  }

  if (!res.ok) {
    // 5xx and rate-limit are transient; other 4xx are not.
    return { ok: false, retryable: res.status >= 500 || res.status === 429, status: res.status };
  }

  let data: { choices?: { message?: { content?: unknown } }[] };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, retryable: true };
  }

  const parsed = extractJson(data.choices?.[0]?.message?.content);
  if (parsed == null) return { ok: false, retryable: true };
  return { ok: true, value: parsed };
}

/** Call OpenRouter in JSON mode and return the parsed object from the
 *  model's reply. Hardened for reliability: per-call model fallback, a
 *  generous token budget with low reasoning effort, tolerant JSON
 *  extraction, and whole-request retries on transient/empty responses.
 *  Every terminal failure surfaces as a `BackendError(500, "INTERNAL", …)`
 *  the caller lets bubble to the dispatcher. */
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

  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await callOnce(key, args);
    if (r.ok) return r.value;
    lastStatus = r.status;
    if (!r.retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_BASE_MS * attempt);
  }

  if (lastStatus && lastStatus < 500 && lastStatus !== 429) {
    throw new BackendError(500, "INTERNAL", `AI service error (${lastStatus}).`);
  }
  throw new BackendError(
    500,
    "INTERNAL",
    "The AI service didn't return a usable response. Please try again.",
  );
}
