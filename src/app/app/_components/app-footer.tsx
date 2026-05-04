import Link from "next/link";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/version";

/** Quiet end-of-page footer for every /app surface. Uses the same
 *  uppercase / tracked editorial voice as the landing footer but in a
 *  thinner pill so the typing screens don't lose vertical room. The
 *  `compact` flag (forwarded from <AppChrome>) hides the row on
 *  practice-style screens at <md so the OS keyboard never displaces
 *  the typing area on a phone — the drawer carries the same links
 *  there via <AppDrawerExtras>. */
export function AppFooter({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <footer
      data-ft-footer
      className={cn(
        "safe-pb flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-[10px] uppercase tracking-[0.16em] sm:px-7",
        dark
          ? "border-ft-ink-line bg-ft-ink/85 text-ft-warm-2"
          : "border-border bg-background/85 text-muted-foreground",
        // Drop the strip on phones in compact-chrome screens (practice,
        // races) where every pixel matters and the drawer handles
        // these links instead.
        compact && "hidden md:flex",
      )}
    >
      <span>FLINTTYPE © MMXXVI</span>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
        <FooterLink href={GITHUB_URL} external dark={dark}>
          GitHub
        </FooterLink>
        <FooterLink href="/app/customise" dark={dark}>
          Settings
        </FooterLink>
        <FooterLink href="/changelog" dark={dark}>
          Changelog
        </FooterLink>
        <FooterLink href="/privacy" dark={dark}>
          Privacy
        </FooterLink>
      </nav>
    </footer>
  );
}

function FooterLink({
  href,
  external = false,
  dark,
  children,
}: {
  href: string;
  external?: boolean;
  dark: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "transition-colors",
    dark ? "hover:text-ft-paper" : "hover:text-foreground",
  );
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
