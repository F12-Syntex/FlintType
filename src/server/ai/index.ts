import { generateText, type LanguageModel } from 'ai';
import type { ChatOutput, ChatUsage, Preset } from '@/types/ai';
import { PRESETS } from './presets';
import { getProvider } from './provider';

/**
 * Preset → model instance. Usable directly with `generateText({ model: ai.smart(), ... })`
 * for handlers that want the raw AI SDK surface. For the common case prefer
 * {@link generateChat} which returns a normalized {@link ChatOutput}.
 */
export const ai: Record<Preset, () => LanguageModel> = {
  fast: () => getProvider().chat(PRESETS.fast),
  smart: () => getProvider().chat(PRESETS.smart),
  cheap: () => getProvider().chat(PRESETS.cheap),
};

/**
 * Calls OpenRouter with the given preset + prompt and returns the text plus
 * a normalized usage bag. The returned shape matches the wire contract of the
 * `ai.chat` route. Usage is handed back to the caller for display but is
 * not persisted — if you need billing-grade tracking, lean on OpenRouter's
 * Langfuse broadcast (see docs/ai.md → Observability).
 */
export async function generateChat(opts: {
  preset: Preset;
  prompt: string;
}): Promise<ChatOutput> {
  const result = await generateText({
    model: ai[opts.preset](),
    prompt: opts.prompt,
  });
  return {
    text: result.text,
    preset: opts.preset,
    model: PRESETS[opts.preset],
    usage: extractUsage(result),
  };
}

type GenerateTextResult = Awaited<ReturnType<typeof generateText>>;

function extractUsage(result: GenerateTextResult): ChatUsage {
  const u = result.usage;
  const meta = result.providerMetadata?.openrouter as
    | { usage?: { cost?: number | string } }
    | undefined;
  const raw = meta?.usage?.cost;
  const totalCostUsd =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw)
        : null;
  return {
    inputTokens: u.inputTokens ?? null,
    outputTokens: u.outputTokens ?? null,
    totalTokens: u.totalTokens ?? null,
    totalCostUsd:
      totalCostUsd !== null && Number.isFinite(totalCostUsd)
        ? totalCostUsd
        : null,
  };
}

export { PRESETS } from './presets';
