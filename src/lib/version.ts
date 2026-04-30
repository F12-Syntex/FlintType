// Resolved at build time from the project's VERSION file via
// `next.config.ts` → `env.NEXT_PUBLIC_APP_VERSION`. Safe to import in
// both client and server modules.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_VERSION_LABEL = `v${APP_VERSION} · OPEN SOURCE`;
