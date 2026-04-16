import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { echo } from './routes/echo';
import { health } from './routes/health';
import { users } from './routes/users';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    echo,
    users,
  },
});

export type Router = typeof router;
