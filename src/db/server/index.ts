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
import { presenceRepo, type PresenceRepo } from './repositories/presence';
import {
  liveSessionsRepo,
  type LiveSessionsRepo,
} from './repositories/live-sessions';
import {
  liveSpectatorsRepo,
  type LiveSpectatorsRepo,
} from './repositories/live-spectators';
import {
  testAnalysesRepo,
  type TestAnalysesRepo,
} from './repositories/test-analyses';
import {
  testSummariesRepo,
  type TestSummariesRepo,
} from './repositories/test-summaries';

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
  presence: PresenceRepo;
  liveSessions: LiveSessionsRepo;
  liveSpectators: LiveSpectatorsRepo;
  testAnalyses: TestAnalysesRepo;
  testSummaries: TestSummariesRepo;
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
    presence: presenceRepo(drizzle),
    liveSessions: liveSessionsRepo(drizzle),
    liveSpectators: liveSpectatorsRepo(drizzle),
    testAnalyses: testAnalysesRepo(drizzle),
    testSummaries: testSummariesRepo(drizzle),
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
