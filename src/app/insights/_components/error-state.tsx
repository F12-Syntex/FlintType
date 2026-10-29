import Link from "next/link";
import { useSignInHref } from "@/components/auth/use-sign-in-href";
import { Button, buttonVariants } from "@/components/ui/button";
import type { TestKind } from "./copy-phrases";
import { ERROR_TITLE, SIGN_IN, switchErrorTitle, TRY_AGAIN } from "./insights-copy";
import { type LoadError, loadErrorLine } from "./load-error";

/** The page couldn't load (spec-40 §4): a dashed card with what went
 *  wrong and one way forward. Signed out, the way forward is the page's
 *  one filled primary; otherwise an outline "Try again". */
export function ErrorState({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
  const signInHref = useSignInHref();
  const line = loadErrorLine(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-8 sm:items-center sm:text-center"
    >
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{ERROR_TITLE}</h2>
      <p className="text-sm text-muted-foreground">{line}</p>
      {error.kind === "signIn" ? (
        <Link href={signInHref} className={buttonVariants({ size: "lg", className: "mt-1 w-full sm:w-auto" })}>
          {SIGN_IN}
        </Link>
      ) : (
        <Button variant="outline" onClick={onRetry} className="mt-1 h-11 w-full sm:h-9 sm:w-auto">
          {TRY_AGAIN}
        </Button>
      )}
    </div>
  );
}

/** A bucket switch failed (spec-40 §4): one line over the content still
 *  on show, naming the kind that failed and mapped like the full card.
 *  Signed out, the line itself links to sign in; otherwise Try again
 *  asks for the same tests again. */
export function SwitchError({ error, kind, onRetry }: { error: LoadError; kind: TestKind; onRetry: () => void }) {
  const signInHref = useSignInHref();
  const line = loadErrorLine(error);
  const action = "inline-flex min-h-11 items-center font-medium underline underline-offset-4 sm:min-h-0";
  return (
    <p className="-mt-4 text-sm text-destructive sm:-mt-6" role="alert">
      {switchErrorTitle(kind)}{" "}
      {error.kind === "signIn" ? (
        <Link href={signInHref} className={action}>
          {line}
        </Link>
      ) : (
        <>
          {line}{" "}
          <button type="button" onClick={onRetry} className={action}>
            {TRY_AGAIN}
          </button>
        </>
      )}
    </p>
  );
}
