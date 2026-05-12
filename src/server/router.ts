import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { adapt } from './routes/adapt';
import { health } from './routes/health';
import { history } from './routes/history';
import { monkeytype } from './routes/monkeytype';
import { notifications } from './routes/notifications';
import { prefs } from './routes/prefs';
import { race } from './routes/race';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    prefs,
    adapt,
    history,
    monkeytype,
    notifications,
    race,
  },
});

export type Router = typeof router;
