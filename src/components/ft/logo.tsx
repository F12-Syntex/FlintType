import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  version,
  href,
  size = "md",
  className,
}: {
  version?: string;
  href?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const targetHref = href ?? "/";
  const flameClass = size === "sm" ? "h-4 w-auto" : "h-6 w-auto";
  const wordClass =
    size === "sm" ? "text-sm tracking-tight" : "text-[17px] tracking-tight";

  return (
    <Link
      href={targetHref}
      aria-label="flinttype home"
      className={cn(
        "group flex shrink-0 items-center gap-2 text-current outline-none",
        "transition-opacity hover:opacity-80 focus-visible:opacity-80",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/flinttype-logo.svg"
        alt=""
        aria-hidden
        className={flameClass}
      />
      <span className={cn("font-bold", wordClass)}>flinttype</span>
      {version ? (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {version}
        </span>
      ) : null}
    </Link>
  );
}
