// Emulated-user personas for the coordinated app simulation.
//
// Emails use Clerk's test pattern (`+clerk_test@example.com`): on a
// development instance these bypass bot protection and accept the fixed
// verification code 424242 — no real inbox, no CAPTCHA. The accounts live
// in the Clerk *dev* instance (labelled, bulk-deletable); all app data
// (follows, notifications, race history) lives in the throwaway local
// PGlite store, never Neon. See the harness README.
//
// Date.now()/random are fine here (this is a plain Playwright spec, not a
// Workflow script).

export type Persona = {
  /** kebab id — used for the storageState filename + display matching. */
  id: string;
  /** the name we set on the profile so rows are recognisable in-app. */
  name: string;
  email: string;
  password: string;
};

// Random-looking, not in any breach list (Clerk rejects compromised pwds).
const PASSWORD = "Fl1nt$im-9271-kex";

export const PERSONAS: Persona[] = [
  { id: "ember", name: "Ember Sim", email: "flinttype.sim.ember+clerk_test@example.com", password: PASSWORD },
  { id: "flint", name: "Flint Sim", email: "flinttype.sim.flint+clerk_test@example.com", password: PASSWORD },
  { id: "spark", name: "Spark Sim", email: "flinttype.sim.spark+clerk_test@example.com", password: PASSWORD },
  { id: "coal", name: "Coal Sim", email: "flinttype.sim.coal+clerk_test@example.com", password: PASSWORD },
];

/** Fixed test verification code for `+clerk_test` emails. */
export const CLERK_TEST_CODE = "424242";

export const STORAGE_DIR = "sim/.auth";

export function storageStatePath(id: string): string {
  return `${STORAGE_DIR}/${id}.json`;
}
