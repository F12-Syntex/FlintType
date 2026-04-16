import { z } from 'zod';

export const PRESET_NAMES = ['fast', 'smart', 'cheap'] as const;
export type Preset = (typeof PRESET_NAMES)[number];

export const chatInputSchema = z.object({
  preset: z.enum(PRESET_NAMES),
  prompt: z.string().min(1).max(50_000),
});

export type ChatInput = z.infer<typeof chatInputSchema>;

export type ChatUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  totalCostUsd: number | null;
};

export type ChatOutput = {
  text: string;
  preset: Preset;
  model: string;
  usage: ChatUsage;
};
