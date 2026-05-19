import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Tag } from "@/components/ft";

/** Fullscreen split shell for /sign-in and /sign-up.
 *
 *  Left panel — always-dark warm-ink surface (bg-ft-ink-deep from the
 *  §2.3 ramp) carrying the brand: flame wordmark top-left, an editorial
 *  brand line filling the middle, and a coral glow anchored bottom-left
 *  as the only atmospheric element. Mode-independent on purpose: the
 *  brand reads the same whether the user is on light or dark.
 *
 *  Right panel — semantic `bg-card`, follows the user's chosen palette
 *  + mode. Holds the actual form: optional eyebrow Tag, h1 title,
 *  description, the page's form `children`, and an alt-link footer
 *  ("No account yet? Create one").
 *
 *  Mobile stacks the two as content-fitted bands (dark hero on top,
 *  form below). Desktop (md+) splits 50/50, both at min-h-screen so
 *  the form vertically centers nicely on a 27" monitor. */
export function AuthShell({
  eyebrow,
  brandLine = "Practice is the only shortcut.",
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  /** Small uppercase tag above the title on the form side (e.g. "Sign in"). */
  eyebrow?: string;
  /** Editorial brand line on the dark panel. Defaults to the flinttype
   *  maxim so consumers can ignore it; pass to override per surface. */
  brandLine?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-background text-foreground md:grid-cols-2">
      {/* LEFT — brand panel. Always dark, mode-independent. */}
      <aside className="safe-pt relative flex flex-col overflow-hidden bg-ft-ink-deep px-6 py-8 text-ft-warm-1 sm:px-10 sm:py-10 md:min-h-screen md:px-12 md:py-12">
        <Logo dark className="relative z-10 text-ft-warm-1" />

        <div className="relative z-10 mt-8 max-w-md md:mb-8 md:mt-auto">
          <p className="text-3xl font-bold leading-[1.05] tracking-tight text-ft-warm-1 sm:text-4xl md:text-5xl lg:text-[3.5rem]">
            {brandLine}
          </p>
        </div>

        {/* Coral glow — the only atmospheric element on the panel.
            Sized to roughly match the user-supplied reference (15rem
            circle anchored bottom-left), not the panel width — so it
            stays compact on a 1920 viewport instead of blooming to
            half the screen. The size-60 / size-32 values land outside
            ui-law §3's narrow hot scale but are motivated decorative
            atmospherics; documented here so future-me doesn't reflex
            to `w-3/4`. Both glows sit behind text (z-0); the panel's
            content gets z-10. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 z-0 block size-60 rounded-full bg-primary/40 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 -left-2 z-0 block size-32 rounded-full bg-primary/60 blur-2xl"
        />
      </aside>

      {/* RIGHT — form panel. Theme-aware. */}
      <section className="safe-pb flex flex-col bg-card text-card-foreground md:min-h-screen">
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 md:px-12 md:py-16">
          <div className="flex w-full max-w-md flex-col gap-8">
            <header className="flex flex-col gap-4">
              {eyebrow ? (
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-px w-6 bg-primary" />
                  <Tag>{eyebrow}</Tag>
                </div>
              ) : null}
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
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

            <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
              {altLabel}{" "}
              <Link
                href={altHref}
                className="font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {altLinkText}
              </Link>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}
