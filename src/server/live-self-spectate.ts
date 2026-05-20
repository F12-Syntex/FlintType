import { IS_DEV, IS_TEST } from "@/server/env";

/** Dev-only convenience. In local development a user may spectate their
 *  OWN live session, so the whole broadcast → watch flow is testable in
 *  one browser without a second account: turn sharing on, practise in one
 *  tab, watch yourself in another (you also show up in your own "Live
 *  now"). The mutual-friend + opt-in gates still apply to everyone else.
 *
 *  Gated `IS_DEV && !IS_TEST`: never in the test runner (so the suite
 *  exercises the real prod self-deny), and never on a hosted deploy
 *  (env.ts refuses `APP_ENV=development` when VERCEL/CI is set). It can't
 *  leak self-spectate into production. */
export function selfSpectateAllowed(): boolean {
  return IS_DEV && !IS_TEST;
}
