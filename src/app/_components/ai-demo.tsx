'use client';

import { useState } from 'react';
import { Show } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBackend } from '@/lib/backend';
import { useAsyncAction } from '@/lib/use-async-action';
import { PRESET_NAMES, type Preset } from '@/types/ai';

export function AiDemo() {
  const backend = useBackend();
  const [preset, setPreset] = useState<Preset>('fast');
  const [prompt, setPrompt] = useState('say hi in five words');

  const action = useAsyncAction(() =>
    backend.ai.chat({ preset, prompt }),
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          ai chat (OpenRouter)
        </span>
        <p className="text-xs text-zinc-500">
          Auth-gated. Token counts and cost are returned on the response but not persisted.
        </p>
      </div>

      <Show when="signed-out">
        <p className="text-xs text-zinc-500">Sign in from the header to try it.</p>
      </Show>

      <Show when="signed-in">
        <div className="flex flex-col gap-2">
          <span id="ai-preset-label" className="text-xs text-zinc-500">
            preset
          </span>
          <div
            role="radiogroup"
            aria-labelledby="ai-preset-label"
            className="flex gap-2"
          >
            {PRESET_NAMES.map((name) => (
              <Button
                key={name}
                role="radio"
                aria-checked={preset === name}
                variant={preset === name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="prompt"
            aria-label="AI prompt"
          />
          <Button
            onClick={action.run}
            disabled={action.loading || !prompt.trim()}
            aria-busy={action.loading}
          >
            {action.loading ? 'thinking…' : 'ask'}
          </Button>
        </div>

        {action.result?.ok && (
          <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {action.result.data.text}
            {'\n\n'}
            <span className="text-zinc-500">
              {action.result.data.model} · {action.result.data.usage.totalTokens ?? '?'} tokens
              {action.result.data.usage.totalCostUsd !== null
                ? ` · $${action.result.data.usage.totalCostUsd.toFixed(6)}`
                : ''}
            </span>
          </pre>
        )}

        {action.result && !action.result.ok && (
          <p className="text-sm text-red-600 dark:text-red-400">
            [{action.result.code}] {action.result.message}
          </p>
        )}
      </Show>
    </div>
  );
}
