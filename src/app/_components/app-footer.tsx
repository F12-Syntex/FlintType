import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISCORD_URL, GITHUB_URL } from "@/lib/version";
import { FooterVersion } from "./footer-version";

const LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: DISCORD_URL, label: "Discord", external: true },
  { href: GITHUB_URL, label: "GitHub", external: true },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Quiet end-of-page footer. Two placements (see <AppChrome>):
 *  - in-flow at the end of a scrolling page (default), so it scrolls
 *    away with the content;
 *  - `pinned` under compact surfaces (practice, races), shown from md
 *    up only — on phones the drawer carries the same links so the OS
 *    keyboard never displaces the typing area.
 *  The version links to the changelog. */
export function AppFooter({ pinned = false }: { pinned?: boolean }) {
  return (
    <footer
      data-ft-footer
      data-pinned={pinned ? "" : undefined}
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted-foreground sm:px-6",
        pinned ? "hidden py-3 md:flex" : "mt-auto border-t border-border/60",
      )}
    >
      <Link
        href="/changelog"
        className="transition-colors hover:text-foreground"
        title="What's new"
      >
        flinttype <FooterVersion />
      </Link>
      {/* data-ft-footer-expand — the link row hides under
       *  data-ft-footer-style="compact" so only the version remains. */}
      <nav
        data-ft-footer-expand
        aria-label="Footer"
        className="flex flex-wrap items-center gap-x-5 gap-y-2"
      >
        {LINKS.map((l) =>
          l.external ? (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              href={l.href}
              className="transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ),
        )}
      </nav>
    </footer>
  );
}
