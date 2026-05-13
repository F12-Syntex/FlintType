import {
  createServerDrizzle,
  type ServerDrizzle,
} from './driver';
import {
  bigramModelsRepo,
  motorFeatureModelsRepo,
  trigramModelsRepo,
  wordModelsRepo,
  type BigramModelsRepo,
  type MotorFeatureModelsRepo,
  type TrigramModelsRepo,
  type WordModelsRepo,
} from './repositories/adapt-models';
import {
  notificationsRepo,
  type NotificationsRepo,
} from './repositories/notifications';
import { testsRepo, type TestsRepo } from './repositories/tests';
import { userPrefsRepo, type UserPrefsRepo } from './repositories/user-prefs';

export type Database = {
  userPrefs: UserPrefsRepo;
  bigramModels: BigramModelsRepo;
  trigramModels: TrigramModelsRepo;
  motorFeatureModels: MotorFeatureModelsRepo;
  wordModels: WordModelsRepo;
  tests: TestsRepo;
  notifications: NotificationsRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(drizzle: ServerDrizzle): Database {
  return {
    userPrefs: userPrefsRepo(drizzle),
    bigramModels: bigramModelsRepo(drizzle),
    trigramModels: trigramModelsRepo(drizzle),
    motorFeatureModels: motorFeatureModelsRepo(drizzle),
    wordModels: wordModelsRepo(drizzle),
    tests: testsRepo(drizzle),
    notifications: notificationsRepo(drizzle),
    $drizzle: drizzle,
  };
}

let instance: Database | null = null;

export function getDatabase(): Database {
  if (!instance) {
    instance = createDatabase(createServerDrizzle());
  }
  return instance;
}

export type { DriverMode, ServerDrizzle } from './driver';
