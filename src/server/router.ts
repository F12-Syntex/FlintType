import { logging } from './middleware';
import { echo } from './routes/echo';
import { health } from './routes/health';
import type { Middleware } from './types';

export const router = {
  health,
  echo,
} as const;

export type Router = typeof router;

export const globalMiddleware: Middleware[] = [logging];
