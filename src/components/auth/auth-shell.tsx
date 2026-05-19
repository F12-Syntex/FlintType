import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Tag } from "@/components/ft";

/** Fullscreen split shell for /sign-in and /sign-up.
 *
 *  Left panel — always-dark warm-ink (bg-ft-ink-deep) editorial poster:
 *  wordmark top-left, edition stamp top-right, big stacked brand line
 *  filling the centre, a supporting sub-line, and a layered coral glow
 *  blooming up from the lower-left as the visual anchor. The brand line
 *  is the design; everything else exists to give it weight.
 *
 *  Right panel — theme-aware `bg-card`, top-aligned form column. Holds
 *  an eyebrow Tag, title, description, the page's form `children`, and
 *  the alt-link footer.
 *
 *  Mobile stacks the panels (dark hero band on top, form below); md+
 *  splits 50/50 at min-h-screen. */
export function AuthShell({
  eyebrow,
  brandLine = (
    <>
      Practice is the
      <br />
      only shortcut.
    </>
  ),
  brandSubline = "A typing test for people getting faster on purpose.",
  edition = "Vol. 06",
  title,
  description,
  children,
  altLabel,
  altHref,
  altLinkText,
}: {
  eyebrow?: string;
  brandLine?: ReactNode;
  brandSubline?: ReactNode;
  /** Tiny editorial stamp in the top-right of the dark panel
   *  (issue / volume / season — anything that gives the poster a date). */
  edition?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  altLabel: string;
  altHref: string;
  altLinkText: string;
}) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-background text-foreground md:grid-cols-2">
      {/* LEFT — brand poster. Always dark, mode-independent. */}
      <aside className="safe-pt relative flex flex-col overflow-hidden bg-ft-ink-deep px-6 py-8 text-ft-warm-1 sm:px-10 sm:py-12 md:min-h-screen md:px-14 md:py-14">
        {/* Top row — wordmark and the edition stamp. */}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <Logo dark className="text-ft-warm-1" />
          {edition ? (
            <div className="hidden flex-col items-end gap-1 text-right md:flex">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ft-warm-2">
                {edition}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-4">
                Practice edition
              </span>
            </div>
          ) : null}
        </div>

        {/* Brand block — kicker lead + big stacked poster type.
            Anchors to the bottom on desktop (md:mt-auto) so the wordmark
            sits at the head and the type fills the lower two-thirds of
            the panel. The subline sits ABOVE the brand line so the
            coral glow blooming from the bottom-left doesn't wash it
            out — magazine-kicker pattern. */}
        <div className="relative z-10 mt-10 max-w-2xl md:mb-6 md:mt-auto">
          {brandSubline ? (
            <p className="mb-4 max-w-md text-xs uppercase tracking-[0.18em] text-ft-warm-3 sm:text-[13px]">
              {brandSubline}
            </p>
          ) : null}
          <p className="text-5xl font-bold leading-[0.95] tracking-[-0.02em] text-ft-warm-1 sm:text-6xl md:text-6xl lg:text-7xl">
            {brandLine}
          </p>
        </div>

        {/* Coral glow — two layered circles blooming from the lower-left.
            Sized big enough on desktop to read as light, not decoration;
            shrunk on mobile so it doesn't flood the short hero band.
            The size-{60,72,96} steps land outside ui-law §3's hot scale
            but are motivated decorative atmospherics, documented here
            so a future reader doesn't reflex-shrink them. Both sit
            behind content (z-0). */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 z-0 block size-60 rounded-full bg-primary/45 blur-3xl md:-bottom-24 md:-left-16 md:size-96 md:bg-primary/55"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-8 -left-4 z-0 block size-40 rounded-full bg-primary/55 blur-2xl md:-bottom-10 md:left-0 md:size-72 md:bg-primary/70"
        />
      </aside>

      {/* RIGHT — form panel. Theme-aware. */}
      <section className="safe-pb flex flex-col bg-card text-card-foreground md:min-h-screen">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 md:px-16 md:py-16">
          <div className="flex w-full max-w-lg flex-col gap-8">
            <header className="flex flex-col gap-5">
              {eyebrow ? (
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-px w-6 bg-primary" />
                  <Tag>{eyebrow}</Tag>
                </div>
              ) : null}
              <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
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
