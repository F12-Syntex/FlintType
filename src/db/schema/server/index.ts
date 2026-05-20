// Barrel for every server-side table. Drizzle's driver picks tables up
// from this file via `import * as schema from '@/db/schema/server'`.
export * from "./user-prefs";
export * from "./adapt-models";
export * from "./tests";
export * from "./word-models";
export * from "./notifications";
export * from "./users";
export * from "./follows";
export * from "./blocks";
export * from "./duels";
export * from "./presence";
