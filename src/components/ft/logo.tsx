import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  dark = false,
  version,
  href,
  size = "md",
  className,
}: {
  dark?: boolean;
  version?: string;
  href?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const targetHref = href ?? (dark ? "/app" : "/");
  const flameClass = size === "sm" ? "h-4 w-auto" : "h-5 w-auto sm:h-6";
  const wordClass =
    size === "sm" ? "text-xs tracking-[0.04em]" : "text-sm tracking-[0.04em]";

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
      <span className={cn("font-bold", wordClass)}>FLINTTYPE</span>
      {version ? (
        <span
          className={cn(
            "hidden text-[11px] tracking-[0.06em] sm:inline",
            dark ? "text-[#6E695F]" : "text-muted-foreground",
          )}
        >
          {version}
        </span>
      ) : null}
    </Link>
  );
}
