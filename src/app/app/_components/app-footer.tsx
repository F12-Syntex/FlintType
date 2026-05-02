import Link from "next/link";
import { Logo } from "@/components/ft";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/version";
import { SignOutLink } from "./sign-out-link";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

// Only meta + utility links here — primary nav (PRACTICE / DRILLS / RACES /
// HISTORY / CUSTOMISE) lives in the topbar; duplicating it here is noise.
const META_LINKS: FooterLink[] = [
  { href: GITHUB_URL, label: "GITHUB", external: true },
  { href: "#status", label: "STATUS" },
  { href: "#privacy", label: "PRIVACY" },
];

function FooterLink({
  link,
  dark,
}: {
  link: FooterLink;
  dark: boolean;
}) {
  const className = cn(
    "transition-colors",
    dark ? "hover:text-ft-paper" : "hover:text-foreground",
  );
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function AppFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className={cn(
        "safe-pb flex flex-col gap-6 border-t px-5 py-7 text-[10px] uppercase tracking-[0.16em] sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-6",
        dark
          ? "border-[#221F1A] bg-ft-ink text-[#9C978A]"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      <div className="flex items-center gap-4">
        <Logo size="sm" dark={dark} />
        <span className={cn(dark ? "text-[#6E695F]" : "text-muted-foreground/70")}>
          © MMXXVI
        </span>
      </div>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 lg:gap-6">
        <SignOutLink dark={dark} />
        <span aria-hidden className="hidden text-current/40 lg:inline">
          ·
        </span>
        {META_LINKS.map((l) => (
          <FooterLink key={l.label} link={l} dark={dark} />
        ))}
      </nav>

      <span
        className={cn(
          "hidden lg:inline",
          dark ? "text-[#6E695F]" : "text-muted-foreground/70",
        )}
      >
        STRIKE · SPARK · SHARPEN
      </span>
    </footer>
  );
}
