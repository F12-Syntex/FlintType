// Resolved at build time from the project's VERSION file via
// `next.config.ts` → `env.NEXT_PUBLIC_APP_VERSION`. Safe to import in
// both client and server modules.
//
// This file is the client-safe entry point and can't import from
// `@/server/env` (server-only — would pull zod into the client
// bundle), so the `process.env.NEXT_PUBLIC_*` read stays inline. The
// server-side counterpart at `src/server/version.ts` routes through
// `env.NEXT_PUBLIC_APP_VERSION` so the env-table contract in
// `src/server/env.ts` remains the single source of truth there.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_VERSION_LABEL = `v${APP_VERSION}`;

export const GITHUB_URL = "https://github.com/F12-Syntex/FlintType";
export const DISCORD_URL = "https://discord.gg/dnewradQxH";
