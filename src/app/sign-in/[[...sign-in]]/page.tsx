import { SignIn } from '@clerk/nextjs';
import { buildPageMetadata } from '@/server/seo';

export const metadata = buildPageMetadata({
  title: 'Sign in',
  description:
    'Sign in to your account. Email, password, and every social provider configured in the Clerk dashboard. Forgot-password flow is built in.',
  path: '/sign-in',
  noIndex: true,
});

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:py-20">
      <h1 className="sr-only">Sign in</h1>
      <SignIn
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
        forceRedirectUrl="/"
      />
    </main>
  );
}
