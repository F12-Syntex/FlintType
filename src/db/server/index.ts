import {
  createServerDrizzle,
  selectDriverMode,
  type DriverMode,
  type ServerDrizzle,
} from './driver';
import { healthRepo, type HealthRepo } from './repositories/health';
import { postsRepo, type PostsRepo } from './repositories/posts';
import { usersRepo, type UsersRepo } from './repositories/users';

export type Database = {
  posts: PostsRepo;
  users: UsersRepo;
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
    users: usersRepo(drizzle),
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
