import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { health } from './routes/health';
import { prefs } from './routes/prefs';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    prefs,
  },
});

export type Router = typeof router;
