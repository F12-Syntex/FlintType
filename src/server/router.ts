import { defineNamespace } from '@/server';
import { logging } from './middleware/logging';
import { admin } from './routes/admin';
import { ai } from './routes/ai';
import { echo } from './routes/echo';
import { health } from './routes/health';
import { posts } from './routes/posts';
import { premium } from './routes/premium';
import { ratelimit } from './routes/ratelimit';
import { users } from './routes/users';

export const router = defineNamespace({
  middleware: [logging],
  routes: {
    health,
    echo,
    users,
    posts,
    ai,
    admin,
    ratelimit,
    premium,
  },
});

export type Router = typeof router;
