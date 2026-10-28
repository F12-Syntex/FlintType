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

const LINK_CLASS =
  "inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0";

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
        // Phones: each link is a 44px-tall target (ui-law §7), so the
        // rows sit flush and the footer padding shrinks to match.
        "flex shrink-0 flex-wrap items-center justify-between gap-x-6 px-4 py-1 text-xs text-muted-foreground sm:gap-y-2 sm:px-6 sm:py-4",
        pinned ? "hidden sm:py-3 md:flex" : "mt-auto border-t border-border/60",
      )}
    >
      <Link
        href="/changelog"
        // gap-1 stands in for the space a flex row would collapse.
        className={cn(LINK_CLASS, "gap-1")}
        title="What's new"
      >
        flinttype <FooterVersion />
      </Link>
      {/* data-ft-footer-expand — the link row hides under
       *  data-ft-footer-style="compact" so only the version remains. */}
      <nav
        data-ft-footer-expand
        aria-label="Footer"
        className="flex flex-wrap items-center gap-x-5 sm:gap-y-2"
      >
        {LINKS.map((l) =>
          l.external ? (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              href={l.href}
              className={LINK_CLASS}
            >
              {l.label}
            </Link>
          ),
        )}
      </nav>
    </footer>
  );
}
