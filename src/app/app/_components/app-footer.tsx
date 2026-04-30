import Link from "next/link";
import { Logo } from "@/components/ft";
import { cn } from "@/lib/utils";
import { SignOutLink } from "./sign-out-link";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const PRIMARY_LINKS: FooterLink[] = [
  { href: "/app/customise", label: "SETTINGS" },
  { href: "/app/history", label: "HISTORY" },
  { href: "/app/race", label: "RACES" },
];

const META_LINKS: FooterLink[] = [
  { href: "https://github.com/", label: "GITHUB", external: true },
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
    dark ? "hover:text-ft-paper" : "hover:text-ft-ink",
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
        "flex flex-col gap-6 border-t px-5 py-7 text-[10px] uppercase tracking-[0.16em] sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-6",
        dark
          ? "border-[#221F1A] bg-ft-ink text-[#9C978A]"
          : "border-ft-line-soft bg-ft-paper text-ft-dim",
      )}
    >
      <div className="flex items-center gap-4">
        <Logo size="sm" dark={dark} />
        <span className={cn(dark ? "text-[#6E695F]" : "text-ft-dim-2")}>
          © MMXXVI
        </span>
      </div>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 lg:gap-6">
        {PRIMARY_LINKS.map((l) => (
          <FooterLink key={l.label} link={l} dark={dark} />
        ))}
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
          dark ? "text-[#6E695F]" : "text-ft-dim-2",
        )}
      >
        STRIKE · SPARK · SHARPEN
      </span>
    </footer>
  );
}
