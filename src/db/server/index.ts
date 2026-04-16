import { createServerDrizzle, type ServerDrizzle } from './driver';
import { aiUsageRepo, type AiUsageRepo } from './repositories/ai-usage';
import { postsRepo, type PostsRepo } from './repositories/posts';

export type Database = {
  posts: PostsRepo;
  aiUsage: AiUsageRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(drizzle: ServerDrizzle): Database {
  return {
    posts: postsRepo(drizzle),
    aiUsage: aiUsageRepo(drizzle),
    $drizzle: drizzle,
  };
}

let instance: Database | null = null;

export function getDatabase(): Database {
  if (!instance) instance = createDatabase(createServerDrizzle());
  return instance;
}

export type { ServerDrizzle } from './driver';
