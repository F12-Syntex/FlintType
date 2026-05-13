import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";

/** Identity tag chip — `og`, `owner`, etc.
 *
 *  Each tag paints from its own per-tag token quartet defined in
 *  `globals.css` (`--ft-tag-<id>-fg / -border / -fill / -glow`). Tokens
 *  are *fixed* across palettes (ui-law §2.3) so the tag reads as a
 *  *kind*, not as theme chrome. Only the fill alpha drops in dark mode
 *  so the chip doesn't pop hot against an ink surface.
 *
 *  Sizes:
 *    - `sm` — leaderboard-row scale (h-5, text-[10px])
 *    - `md` — profile-hero scale   (h-6, text-[11px])
 *
 *  No animation. The "glow" is a static box-shadow stored on the
 *  per-tag `--ft-tag-<id>-glow` custom property. */
export function UserTag({
  tag,
  size = "sm",
  className,
}: {
  tag: UserTagId;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = TAG_CONFIG[tag];
  const sizeClass =
    size === "md"
      ? "h-6 gap-1.5 px-2 text-[11px]"
      : "h-5 gap-1 px-1.5 text-[10px]";
  const iconSize = size === "md" ? 13 : 11;
  return (
    <span
      role="img"
      aria-label={config.aria}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border font-semibold uppercase leading-none tracking-[0.14em]",
        sizeClass,
        className,
      )}
      style={{
        color: `var(--ft-tag-${tag}-fg)`,
        backgroundColor: `var(--ft-tag-${tag}-fill)`,
        borderColor: `var(--ft-tag-${tag}-border)`,
        boxShadow: `var(--ft-tag-${tag}-glow)`,
      }}
    >
      <TagGlyph kind={config.icon} size={iconSize} />
      <span>{config.label}</span>
    </span>
  );
}

type IconKind = "compass" | "signet";

const TAG_CONFIG: Record<
  UserTagId,
  { label: string; aria: string; icon: IconKind }
> = {
  og: {
    label: "OG",
    aria: "OG — founding member",
    icon: "compass",
  },
  owner: {
    label: "Owner",
    aria: "Owner",
    icon: "signet",
  },
};

function TagGlyph({ kind, size }: { kind: IconKind; size: number }): ReactNode {
  if (kind === "compass") {
    // Mapmaker's compass rose, simplified. North arm filled (drives
    // direction); south is a smaller mirror; east/west are quiet
    // ticks so the glyph reads as a compass at 11–13px without
    // collapsing into a blob.
    return (
      <svg
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <circle cx="8" cy="8" r="6" />
        <path d="M8 3 L9.3 8 L8 9 L6.7 8 Z" fill="currentColor" stroke="none" />
        <line x1="8" y1="9" x2="8" y2="12.5" />
        <line x1="3.5" y1="8" x2="6.8" y2="8" strokeOpacity="0.55" />
        <line x1="12.5" y1="8" x2="9.2" y2="8" strokeOpacity="0.55" />
      </svg>
    );
  }
  // signet — pressed-paper hex with a filled center dot
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M8 1.6 L13.6 5 L13.6 11 L8 14.4 L2.4 11 L2.4 5 Z" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
