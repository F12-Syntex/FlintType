import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description:
    "Create a flinttype account. Email + password or one-tap Google. Email verification is automatic.",
  path: "/sign-up",
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Track your typing model across sessions, unlock the adaptive drills, and import your MonkeyType history if you want to."
      altLabel="Already have an account?"
      altHref="/sign-in"
      altLinkText="Sign in →"
    >
      <SignUpForm />
    </AuthShell>
  );
}
