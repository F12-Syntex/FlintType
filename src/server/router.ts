import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { adapt } from './routes/adapt';
import { admin } from './routes/admin';
import { duels } from './routes/duels';
import { friends } from './routes/friends';
import { health } from './routes/health';
import { history } from './routes/history';
import { leaderboard } from './routes/leaderboard';
import { live } from './routes/live';
import { lobby } from './routes/lobby';
import { monkeytype } from './routes/monkeytype';
import { notifications } from './routes/notifications';
import { prefs } from './routes/prefs';
import { presence } from './routes/presence';
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
    duels,
    friends,
    history,
    leaderboard,
    live,
    lobby,
    monkeytype,
    notifications,
    presence,
    profile,
    race,
    share,
  },
});

export type Router = typeof router;
