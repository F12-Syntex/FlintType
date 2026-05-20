import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { adapt } from './routes/adapt';
import { admin } from './routes/admin';
import { friends } from './routes/friends';
import { health } from './routes/health';
import { history } from './routes/history';
import { leaderboard } from './routes/leaderboard';
import { monkeytype } from './routes/monkeytype';
import { notifications } from './routes/notifications';
import { prefs } from './routes/prefs';
import { profile } from './routes/profile';
import { race } from './routes/race';
import { share } from './routes/share';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    prefs,
    adapt,
    admin,
    friends,
    history,
    leaderboard,
    monkeytype,
    notifications,
    profile,
    race,
    share,
  },
});

export type Router = typeof router;
