import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { health } from './routes/health';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
  },
});

export type Router = typeof router;
