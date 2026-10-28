import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Sign up",
  description:
    "Create a flinttype account. Email + password or one-tap Discord. Email verification is automatic.",
  path: "/sign-up",
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <AuthShell
      altLabel="Already have an account?"
      altHref="/sign-in"
      altLinkText="Sign in"
    >
      <SignUpForm />
    </AuthShell>
  );
}
