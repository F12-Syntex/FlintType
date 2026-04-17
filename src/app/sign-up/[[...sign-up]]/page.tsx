import { SignUp } from '@clerk/nextjs';
import { buildPageMetadata } from '@/server/seo';

export const metadata = buildPageMetadata({
  title: 'Sign up',
  description:
    'Create an account. Email verification and every social provider configured in the Clerk dashboard work automatically.',
  path: '/sign-up',
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:py-20">
      <h1 className="sr-only">Sign up</h1>
      <SignUp
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
        forceRedirectUrl="/"
      />
    </main>
  );
}
