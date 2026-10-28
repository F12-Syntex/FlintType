import Link from "next/link";
import type { ReactNode } from "react";

/** Auth surface shell — a single centred card over the page aura.
 *
 *  Flame logo + h1 + one line of description as the card header, the
 *  page's form as the body, then two quiet links under the card: the
 *  alternative ("No account yet? Create one") and a way back out to
 *  practice without an account. The card fades and lifts in on mount;
 *  the links trail it by 200ms. */
export function AuthShell({
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    // The safe-area utilities set padding-top/bottom themselves, so the
    // breathing room lives on an inner wrapper rather than fighting them.
    <main className="safe-pt safe-pb flex min-h-dvh w-full flex-col text-foreground">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="w-full animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 rounded-2xl border border-border bg-card text-card-foreground shadow-card duration-500 motion-reduce:animate-none">
            <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center sm:px-8">
              <Link
                href="/"
                aria-label="flinttype home"
                className="mb-1 inline-flex rounded-pill focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/flinttype-logo.svg"
                  alt=""
                  aria-hidden
                  className="size-12"
                />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <div className="px-6 pb-8 sm:px-8">{children}</div>
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-4 duration-500 [animation-delay:200ms] [animation-fill-mode:both] motion-reduce:animate-none">
            <p>
              {altLabel}{" "}
              <Link
                href={altHref}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {altLinkText}
              </Link>
            </p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-pill px-3 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Keep practising without an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
