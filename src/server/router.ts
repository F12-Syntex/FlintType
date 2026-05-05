import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { adapt } from './routes/adapt';
import { health } from './routes/health';
import { prefs } from './routes/prefs';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    prefs,
    adapt,
  },
});

export type Router = typeof router;
