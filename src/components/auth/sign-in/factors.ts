/** How a returning user can prove it's them, as offered by Clerk's
 *  `supportedFirstFactors` for the email they entered. */
export type FactorKind = "password" | "code" | "link";

type SupportedFirstFactor =
  | { strategy: "password" }
  | { strategy: "email_code"; emailAddressId: string }
  | { strategy: "email_link"; emailAddressId: string }
  | { strategy: string; emailAddressId?: string };

/** Reduce Clerk's factor list to the kinds this form supports, plus the
 *  email-address id the code / link strategies need. Only methods Clerk
 *  reports as enabled come back (toggle the rest in the Clerk dashboard). */
export function collectFactors(factors: readonly SupportedFirstFactor[]): {
  emailAddressId: string | null;
  available: FactorKind[];
} {
  const available: FactorKind[] = [];
  let emailAddressId: string | null = null;
  for (const factor of factors) {
    if (factor.strategy === "password" && !available.includes("password")) {
      available.push("password");
    } else if (factor.strategy === "email_code") {
      if (!available.includes("code")) available.push("code");
      emailAddressId = emailAddressId ?? factor.emailAddressId ?? null;
    } else if (factor.strategy === "email_link") {
      if (!available.includes("link")) available.push("link");
      emailAddressId = emailAddressId ?? factor.emailAddressId ?? null;
    }
  }
  return { emailAddressId, available };
}
