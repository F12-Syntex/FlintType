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
import { usersRepo, type UsersRepo } from './repositories/users';
import { followsRepo, type FollowsRepo } from './repositories/follows';
import { blocksRepo, type BlocksRepo } from './repositories/blocks';
import { duelsRepo, type DuelsRepo } from './repositories/duels';

export type Database = {
  userPrefs: UserPrefsRepo;
  users: UsersRepo;
  bigramModels: BigramModelsRepo;
  trigramModels: TrigramModelsRepo;
  motorFeatureModels: MotorFeatureModelsRepo;
  wordModels: WordModelsRepo;
  tests: TestsRepo;
  notifications: NotificationsRepo;
  follows: FollowsRepo;
  blocks: BlocksRepo;
  duels: DuelsRepo;
  $drizzle: ServerDrizzle;
};

export function createDatabase(drizzle: ServerDrizzle): Database {
  return {
    userPrefs: userPrefsRepo(drizzle),
    users: usersRepo(drizzle),
    bigramModels: bigramModelsRepo(drizzle),
    trigramModels: trigramModelsRepo(drizzle),
    motorFeatureModels: motorFeatureModelsRepo(drizzle),
    wordModels: wordModelsRepo(drizzle),
    tests: testsRepo(drizzle),
    notifications: notificationsRepo(drizzle),
    follows: followsRepo(drizzle),
    blocks: blocksRepo(drizzle),
    duels: duelsRepo(drizzle),
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
