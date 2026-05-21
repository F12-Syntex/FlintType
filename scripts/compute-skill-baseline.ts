#!/usr/bin/env tsx
/**
 * Recompute the skill-radar average baseline from real data and rewrite
 * `src/lib/skill-baseline.ts`. Run periodically; commit the result.
 *
 *   yarn skills:baseline
 *
 * For each user with enough completed tests, computes their four skill
 * axes (the SAME `deriveSkills` math the profile renders) and averages
 * each axis across users. Local dev runs against PGlite; to compute from
 * production, point DATABASE_URL at Neon (copy .env.production.local →
 * .env.local for the run), same as the other backfill scripts.
 *
 * Thin entry: populate process.env BEFORE importing the db layer (ES
 * imports hoist above top-level code), then hand off to the run module.
 */
import { readFileSync } from "node:fs";

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* file missing — env may already be in the shell */
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

void (async () => {
  try {
    const { run } = await import("./compute-skill-baseline-run");
    await run();
  } catch (err) {
    console.error("\nFatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
