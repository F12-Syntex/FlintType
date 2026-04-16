import {
  createOpenRouter,
  type OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';
import { BackendError } from '@/lib/errors';
import { env } from '@/server/env';

let instance: OpenRouterProvider | null = null;

/**
 * Lazy singleton. Throws `BackendError(500, 'INTERNAL', ...)` when called
 * without OPENROUTER_API_KEY so the app still boots; only AI routes fail.
 */
export function getProvider(): OpenRouterProvider {
  if (!env.OPENROUTER_API_KEY) {
    throw new BackendError(
      500,
      'INTERNAL',
      'OPENROUTER_API_KEY not set — add it to .env.local to use AI routes',
    );
  }
  if (!instance) {
    instance = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  }
  return instance;
}

/** For tests that swap the provider between cases. */
export function resetProvider(): void {
  instance = null;
}
