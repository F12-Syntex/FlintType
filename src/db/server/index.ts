import {
  createServerDrizzle,
  selectDriverMode,
  type DriverMode,
  type ServerDrizzle,
} from './driver';
import {
  bigramModelsRepo,
  motorFeatureModelsRepo,
  trigramModelsRepo,
  type BigramModelsRepo,
  type MotorFeatureModelsRepo,
  type TrigramModelsRepo,
} from './repositories/adapt-models';
import { testsRepo, type TestsRepo } from './repositories/tests';
import { userPrefsRepo, type UserPrefsRepo } from './repositories/user-prefs';

export type Database = {
  userPrefs: UserPrefsRepo;
  bigramModels: BigramModelsRepo;
  trigramModels: TrigramModelsRepo;
  motorFeatureModels: MotorFeatureModelsRepo;
  tests: TestsRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(
  drizzle: ServerDrizzle,
  _driver: DriverMode,
): Database {
  return {
    userPrefs: userPrefsRepo(drizzle),
    bigramModels: bigramModelsRepo(drizzle),
    trigramModels: trigramModelsRepo(drizzle),
    motorFeatureModels: motorFeatureModelsRepo(drizzle),
    tests: testsRepo(drizzle),
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
