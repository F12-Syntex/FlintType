import { createServerDrizzle, type ServerDrizzle } from './driver';
import { postsRepo, type PostsRepo } from './repositories/posts';

export type Database = {
  posts: PostsRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(drizzle: ServerDrizzle): Database {
  return {
    posts: postsRepo(drizzle),
    $drizzle: drizzle,
  };
}

let instance: Database | null = null;

export function getDatabase(): Database {
  if (!instance) instance = createDatabase(createServerDrizzle());
  return instance;
}

export type { ServerDrizzle } from './driver';
