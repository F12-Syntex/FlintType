import Link from "next/link";
import { cn } from "@/lib/utils";
import { GITHUB_URL } from "@/lib/version";
import { SignOutLink } from "./sign-out-link";

type Item = { href: string; label: string; external?: boolean };

// Meta + utility only — primary nav already lives in the drawer above.
const META: Item[] = [
  { href: GITHUB_URL, label: "GITHUB", external: true },
  { href: "#status", label: "STATUS" },
  { href: "#privacy", label: "PRIVACY" },
];

function FooterLink({
  item,
  className,
}: {
  item: Item;
  className: string;
}) {
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

/** Mobile drawer's bottom utility section — meta links + sign out only.
 *  Page nav lives in the drawer body above; no duplication. */
export function AppDrawerExtras({ dark = false }: { dark?: boolean }) {
  const linkClass = cn(
    "uppercase tracking-[0.16em] transition-colors",
    dark ? "text-[#9C978A] hover:text-ft-paper" : "text-ft-dim hover:text-ft-ink",
  );

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <SignOutLink dark={dark} />
        {META.map((item) => (
          <FooterLink key={item.label} item={item} className={linkClass} />
        ))}
      </div>
      <span
        className={cn(
          "mt-1 text-[10px] uppercase tracking-[0.16em]",
          dark ? "text-[#6E695F]" : "text-ft-dim-2",
        )}
      >
        STRIKE · SPARK · SHARPEN
      </span>
    </div>
  );
}
