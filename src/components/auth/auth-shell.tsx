import Link from "next/link";
import type { ReactNode } from "react";
import { Tag } from "@/components/ft";

/** Shared editorial wrapper around the custom sign-in / sign-up
 *  forms. The flame mark sits at the top of a centred card; title
 *  and description read centre-aligned underneath. The form's own
 *  visual surface (Discord button, divider, email/password fields)
 *  renders as `children`; the alt-link footer (No account? / Sign
 *  in?) sits below the card. */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  /** Optional eyebrow above the title. Pass undefined to omit
   *  entirely (the sign-in page does this — the title alone reads
   *  cleaner than "Welcome back / Sign in"). */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          {/* Card — logo at top, centred title + description, form
           *  body. Hairline border + bg-card so it lifts off the page
           *  background regardless of light / dark mode. */}
          <div className="flex w-full flex-col gap-7 rounded-md border border-border bg-card px-6 py-9 shadow-sm sm:px-8 sm:py-10">
            <header className="flex flex-col items-center gap-4 text-center">
              <Link
                href="/"
                aria-label="flinttype"
                className="inline-flex items-center justify-center"
              >
                <img
                  src="/flinttype-logo.svg"
                  alt=""
                  className="size-12 shrink-0"
                />
              </Link>
              {eyebrow ? (
                <div className="flex items-center gap-3">
                  <span aria-hidden className="inline-block h-px w-5 bg-primary" />
                  <Tag>{eyebrow}</Tag>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
                  {title}
                </h1>
                {description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            </header>

            {children}
          </div>

          <p className="text-center text-[12.5px] text-muted-foreground">
            {altLabel}{" "}
            <Link
              href={altHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {altLinkText}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
