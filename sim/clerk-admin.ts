// Clerk Backend-API helpers for the simulation. Uses the dev-instance
// secret key (CLERK_SECRET_KEY, exported into the test process from
// .env.local) to provision persona accounts deterministically — no UI
// sign-up, so no CAPTCHA / email round-trip / password-policy friction.
import { PERSONAS, type Persona } from "./personas";

const API = "https://api.clerk.com/v1";

function headers(): Record<string, string> {
  const sk = process.env.CLERK_SECRET_KEY;
  if (!sk) throw new Error("CLERK_SECRET_KEY missing — export it before running the sim");
  return { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" };
}

/** Delete any existing account for this email, then create a fresh one with
 *  a known password + username. Returns the new Clerk user id. */
export async function provisionPersona(p: Persona): Promise<string> {
  const H = headers();
  const found = await fetch(
    `${API}/users?email_address=${encodeURIComponent(p.email)}`,
    { headers: H },
  ).then((r) => r.json());
  if (Array.isArray(found)) {
    for (const u of found) {
      await fetch(`${API}/users/${u.id}`, { method: "DELETE", headers: H });
    }
  }
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      email_address: [p.email],
      password: p.password,
      skip_password_checks: true,
      skip_legal_checks: true,
      first_name: p.name.split(" ")[0],
      last_name: "Sim",
      username: `sim_${p.id}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`provision ${p.id} failed: ${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  }
  return body.id as string;
}

export async function provisionPersonas(): Promise<void> {
  for (const p of PERSONAS) {
    const id = await provisionPersona(p);
    console.log(`[provision] ${p.id} → ${id}`);
  }
}

// CLI entry: `tsx sim/clerk-admin.ts`
if (process.argv[1] && process.argv[1].endsWith("clerk-admin.ts")) {
  provisionPersonas()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
