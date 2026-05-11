import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Tag } from "@/components/ft";

/** Shared editorial wrapper around the custom sign-in / sign-up
 *  forms. Centred, max-width-md card with a small eyebrow + title
 *  + flinttype mark in the corner. The form's own visual surface
 *  (inputs, OAuth buttons, footer link) renders as `children`. */
export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 lg:top-10 lg:left-10">
        <Logo size="sm" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-5 py-16 sm:py-20">
        <div className="flex w-full max-w-md flex-col gap-8">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span aria-hidden className="inline-block h-px w-7 bg-primary" />
              <Tag>{eyebrow}</Tag>
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </header>

          {children}

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
