"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";

/** Module-level stable default — useRemotePrefs captures it once. */
const SPECTATE_DEFAULT = { enabled: false };

/** The "friends can watch" status chip. Presentational + pure so the
 *  Behaviour settings preview can render it at a forced state and the
 *  practice screen can render the live one. The single coral spark is
 *  spent on the live state's dot; the off state is quiet ink. */
export function SpectatePill({
  enabled,
  asLink = false,
  className,
}: {
  enabled: boolean;
  asLink?: boolean;
  className?: string;
}) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
        enabled
          ? "border-primary/30 bg-primary/[0.06] text-foreground"
          : "border-border bg-card text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          enabled
            ? "bg-primary motion-safe:animate-pulse"
            : "bg-muted-foreground/40",
        )}
      />
      <Eye size={12} className="shrink-0" aria-hidden />
      {enabled ? "Friends can watch" : "Sharing off"}
    </span>
  );
  if (!asLink) return inner;
  return (
    <Link
      href="/customise/behaviour#spectate"
      aria-label="Live spectating settings"
      className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {inner}
    </Link>
  );
}

/** Mounted on practice surfaces. Shows the chip only when the signed-in
 *  user has opted in to being spectated, so it doubles as the live
 *  consent reminder; the chip links to the toggle. Renders nothing
 *  otherwise (the common case) so it never reflows the typing area. */
export function SpectateIndicator({ className }: { className?: string }) {
  const { isSignedIn } = useUser();
  const { value } = useRemotePrefs<{ enabled: boolean }>(
    "spectate",
    SPECTATE_DEFAULT,
  );
  if (!isSignedIn || !value.enabled) return null;
  return (
    <div className={cn("flex justify-end", className)}>
      <SpectatePill enabled asLink />
    </div>
  );
}
