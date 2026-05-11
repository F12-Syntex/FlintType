import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Sign in",
  description:
    "Sign in to your flinttype account. Email + password or one-tap Discord.",
  path: "/sign-in",
  noIndex: true,
});

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in to flinttype"
      description="Pick up where you left off — your typing model, drills, and personal bests are waiting."
      altLabel="No account yet?"
      altHref="/sign-up"
      altLinkText="Create one"
    >
      <SignInForm />
    </AuthShell>
  );
}
