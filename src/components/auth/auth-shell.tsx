import Link from "next/link";
import type { ReactNode } from "react";
import { Tag } from "@/components/ft";

/** Auth surface shell — single centered card on bg-background.
 *
 *  Renders a flame logo + optional eyebrow + h1 title + description as
 *  the card header, then the page's form `children`, then an alt-link
 *  sentence below the card ("No account yet? Create one"). The card
 *  fades and zooms in on mount; the footer trails it by 200ms. */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    <main className="safe-pt safe-pb flex min-h-screen w-full items-center justify-center bg-background p-4 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="w-full animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 rounded-md border border-border bg-card text-card-foreground shadow-sm duration-500">
          <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center sm:px-8">
            <Link href="/" aria-label="flinttype home" className="mb-2 inline-flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/flinttype-logo.svg"
                alt=""
                aria-hidden
                className="size-12"
              />
            </Link>
            {eyebrow ? <Tag>{eyebrow}</Tag> : null}
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
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

        <p className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 w-full max-w-md text-center text-sm text-muted-foreground duration-500 [animation-delay:200ms] [animation-fill-mode:both]">
          {altLabel}{" "}
          <Link
            href={altHref}
            className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {altLinkText}
          </Link>
        </p>
      </div>
    </main>
  );
}
