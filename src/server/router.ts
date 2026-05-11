import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { adapt } from './routes/adapt';
import { health } from './routes/health';
import { history } from './routes/history';
import { monkeytype } from './routes/monkeytype';
import { prefs } from './routes/prefs';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    prefs,
    adapt,
    history,
    monkeytype,
  },
});

export type Router = typeof router;
