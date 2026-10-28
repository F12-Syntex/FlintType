import Link from "next/link";
import { useSignInHref } from "@/components/auth/use-sign-in-href";
import { Button, buttonVariants } from "@/components/ui/button";

export type LoadError = { message: string; signIn: boolean };

/** The page couldn't load: say why in the error colour (ui-law §6.3)
 *  and offer the one way forward as the screen's filled primary button,
 *  either Sign in or Try again. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry: () => void;
}) {
  const signInHref = useSignInHref();
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center">
      <p className="text-sm text-destructive" role="alert">
        {error.message}
      </p>
      {error.signIn ? (
        <Link href={signInHref} className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      ) : (
        <Button size="lg" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
