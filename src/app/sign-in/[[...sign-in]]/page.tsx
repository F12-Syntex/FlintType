import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Sign in",
  description:
    "Sign in to your flinttype account. Email + password or one-tap Google.",
  path: "/sign-in",
  noIndex: true,
});

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Pick up where you left off — your typing model, drills, and personal bests are waiting."
      altLabel="No account yet?"
      altHref="/sign-up"
      altLinkText="Create one →"
    >
      <SignInForm />
    </AuthShell>
  );
}
