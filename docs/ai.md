# AI

Authoritative guide for LLM calls. Provider is **OpenRouter** (access to every major model through one API) via the **Vercel AI SDK** (`ai` + `@openrouter/ai-sdk-provider`).

## What ships

- `src/server/ai/presets.ts` — `PRESETS: Record<Preset, string>`, the one edit point for which concrete model each intent resolves to.
- `src/server/ai/provider.ts` — `getProvider()` lazy singleton. Throws `BackendError(500, 'INTERNAL', 'OPENROUTER_API_KEY not set')` on call when the key is unset, so the app still boots without it.
- `src/server/ai/index.ts` — `ai.fast()` / `ai.smart()` / `ai.cheap()` returning a Vercel-AI-SDK-compatible `LanguageModel`, plus `generateChat({ preset, prompt })` that wraps `generateText` and normalizes the usage bag.
- `src/types/ai.ts` — `Preset`, `PRESET_NAMES`, `chatInputSchema`, `ChatOutput`. Client-visible; model ids stay server-only per R9.
- `src/db/schema/server/ai-usage.ts` + repo — one row per call: `(userId, preset, model, inputTokens, outputTokens, totalTokens, totalCostUsd, createdAt)`.
- `src/server/routes/ai/index.ts` — `ai.chat` route under `requireAuth`; persists usage via `ctx.db.aiUsage.log()` on every success.

## Presets — the public surface

Client code only ever mentions an *intent* (`'fast'`, `'smart'`, `'cheap'`) — never a concrete model id. Model ids live exclusively in `src/server/ai/presets.ts`.

```ts
// src/server/ai/presets.ts — edit this, and only this, to swap a model
export const PRESETS: Record<Preset, string> = {
  fast:  'openai/gpt-4o-mini',
  smart: 'anthropic/claude-sonnet-4',
  cheap: 'openai/gpt-4o-mini',
};
```

Adding a preset:

1. Add the name to `PRESET_NAMES` in `src/types/ai.ts` (it's an `as const` tuple — the `Preset` union updates automatically).
2. Add a row to `PRESETS` in `src/server/ai/presets.ts`.
3. Add the factory to the `ai` object in `src/server/ai/index.ts`.
4. Existing `chatInputSchema` (a `z.enum(PRESET_NAMES)`) picks up the new preset for free.

## Calling an LLM from a handler

Two forms. Prefer `generateChat` unless you need `generateText` / `streamText` options:

```ts
// src/server/routes/<ns>/index.ts
import { generateChat } from '@/server/ai';

const chat = defineRoute<ChatInput, ChatOutput>({
  input: chatInputSchema,
  middleware: [requireAuth],
  handler: async ({ input, db, meta }) => {
    const userId = meta.userId as string;
    const result = await generateChat({
      preset: input.preset,
      prompt: input.prompt,
    });
    await db.aiUsage.log({ userId, ...flattenUsage(result) });
    return result;
  },
});
```

For direct AI SDK use — tools, multi-turn, telemetry options:

```ts
import { generateText } from 'ai';
import { ai } from '@/server/ai';

const { text, usage } = await generateText({
  model: ai.smart(),
  messages: [...],
  tools: {...},
});
```

## Usage tracking

Every call logs one row in `ai_usage`. `userId` comes from `ctx.meta.userId` (Clerk id populated by `requireAuth`); `preset` and `model` are logged side-by-side so you can later ask *"what did 'smart' actually resolve to last month"* — useful when presets change under you.

`totalCostUsd` comes from OpenRouter's `providerMetadata.openrouter.usage.cost` field. Stored as `real` (null if the provider didn't include it).

To query: `await db.aiUsage.listByUser(userId, { limit })` — descending `createdAt`.

## Env vars

| Var                  | Values                 | Default | Notes                                                        |
|----------------------|------------------------|---------|--------------------------------------------------------------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` secret  | unset   | Required for AI routes. In `.env.local` (gitignored), never `.env`. App boots without it; only `ai.*` routes fail until set. |

Get a key at <https://openrouter.ai/keys>.

## Testing

Route tests mock `@/server/ai` at the module boundary — not the Vercel AI SDK or the OpenRouter provider directly. That keeps route tests focused on routing, auth, Zod, and persistence.

```ts
vi.mock('@/server/ai', async () => {
  const actual = await vi.importActual<typeof import('@/server/ai')>('@/server/ai');
  return { ...actual, generateChat: vi.fn() };
});

import { generateChat } from '@/server/ai';
const mockGenerateChat = vi.mocked(generateChat);

it('persists usage on success', async () => {
  asUser('user_42');
  mockGenerateChat.mockResolvedValue({ text: 'hi', preset: 'fast', model: '...', usage: {...} });
  await callRoute(['ai', 'chat'], { db, input: { preset: 'fast', prompt: 'hi' } });
  expect(await db.aiUsage.listByUser('user_42')).toHaveLength(1);
});
```

`generateChat` itself is unit-tested against `vi.mock('ai', () => ({ generateText: vi.fn() }))` — see `src/server/ai/index.test.ts`. No real API calls from any test.

Repo tests use `createTestDatabase()` — the `ai_usage` table flows through the committed migration automatically.

## Streaming, tool calls, structured outputs — deferred

The current `defineRoute` pipeline returns JSON via `NextResponse.json(result)`. Streaming needs a different dispatch (Server-Sent Events or a `ReadableStream` body) that doesn't fit the JSON contract cleanly. When it lands it'll be a parallel primitive (`defineStreamRoute` or a raw Next.js handler in `src/app/api/ai/stream/route.ts`), not a mutation of the existing route type.

Tool calling and `generateObject` structured outputs **do** fit `generateText`'s JSON response and can be layered onto `generateChat` (or a sibling helper) when a concrete use case lands. Not ahead of time.

## Observability — Langfuse via OpenRouter Broadcast

Zero code change: in your OpenRouter dashboard → **Settings → Integrations → Langfuse**, paste your Langfuse public + secret keys. Every request is mirrored to Langfuse automatically. Gives you a dashboard with cost, latency, per-model stats, trace trees — nothing to wire up in this repo.

Alternative: pass `experimental_telemetry` to `generateText` and wire Vercel's OTel exporter. Skip unless you're not using OpenRouter Broadcast.

## Rules

### AI1. Never write a raw OpenRouter model id outside `src/server/ai/presets.ts`
Handlers, components, tests — all use `ai.fast()` / `ai.smart()` / `ai.cheap()` or `generateChat({ preset })`. `src/server/ai/presets.ts` is the single edit point.

**Why:** swapping a model is a one-line change. Scattered `'anthropic/claude-*'` literals guarantee drift.

### AI2. The client sends a preset, not a model id
Route `input` schemas use `z.enum(PRESET_NAMES)`. Model ids never leave the server boundary.

### AI3. Authenticated by default
AI routes sit under `requireAuth`. Usage logging needs a `userId`; rate limiting needs an identity. Public AI is an explicit, scoped escape hatch — not the default.

### AI4. Log every successful call
Handlers call `ctx.db.aiUsage.log()` before returning. Missed logs mean missed cost — there's no second source of truth.

### AI5. Tests mock `generateChat` at the module boundary
Not the Vercel SDK, not the OpenRouter provider directly. See the pattern above. No test ever hits the real API.

### AI6. `OPENROUTER_API_KEY` is a secret
`.env.local` only. Never `.env`. Never commit. Production deploys use the platform's secret store.

### AI7. Streaming/tools deferred; `generateText` is the contract
Don't add streaming via an ad-hoc raw route. When it lands it lands as a documented primitive. For now, JSON in, JSON out.

## LLM checklist before submitting an AI change

- [ ] Is every model id in `src/server/ai/presets.ts`, nowhere else?
- [ ] Does the route input accept a preset name (Zod enum), not a free-form string?
- [ ] Is the route under `requireAuth` (AI3)?
- [ ] Does the handler call `ctx.db.aiUsage.log()` on success (AI4)?
- [ ] Do tests mock `@/server/ai`'s `generateChat` rather than the SDK internals?
- [ ] Is `OPENROUTER_API_KEY` only referenced through `env.OPENROUTER_API_KEY` (never `process.env` directly)?
