import {
  createServerDrizzle,
  selectDriverMode,
  type DriverMode,
  type ServerDrizzle,
} from './driver';
import { userPrefsRepo, type UserPrefsRepo } from './repositories/user-prefs';

export type Database = {
  userPrefs: UserPrefsRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(
  drizzle: ServerDrizzle,
  _driver: DriverMode,
): Database {
  return {
    userPrefs: userPrefsRepo(drizzle),
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
