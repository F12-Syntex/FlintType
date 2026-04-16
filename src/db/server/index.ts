import {
  createServerDrizzle,
  selectDriverMode,
  type DriverMode,
  type ServerDrizzle,
} from './driver';
import { aiUsageRepo, type AiUsageRepo } from './repositories/ai-usage';
import { healthRepo, type HealthRepo } from './repositories/health';
import { postsRepo, type PostsRepo } from './repositories/posts';

export type Database = {
  posts: PostsRepo;
  aiUsage: AiUsageRepo;
  /** Inspection queries (size, stats, table rows) — powers `admin.database.*`. */
  $health: HealthRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(
  drizzle: ServerDrizzle,
  driver: DriverMode,
): Database {
  return {
    posts: postsRepo(drizzle),
    aiUsage: aiUsageRepo(drizzle),
    $health: healthRepo(drizzle, driver),
    $drizzle: drizzle,
  };
}

let instance: Database | null = null;

export function getDatabase(): Database {
  if (!instance) {
    const driver = selectDriverMode();
    instance = createDatabase(createServerDrizzle(), driver);
  }
  return instance;
}

export type { DriverMode, ServerDrizzle } from './driver';
