import type { Preset } from '@/types/ai';

/**
 * The one edit point for what each preset resolves to. Change `fast` to a
 * faster model, `smart` to a more capable one, etc. — routes, tests, and
 * client code don't need touching.
 *
 * Use OpenRouter's model ids (provider/name[@variant]). Browse:
 * https://openrouter.ai/models
 */
export const PRESETS: Record<Preset, string> = {
  fast: 'google/gemma-4-31b-it',
  smart: 'google/gemini-3-flash-preview',
  cheap: 'google/gemma-4-31b-it',
};
