import { Compass, Crown, type LucideIcon } from "lucide-react";
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
 *  Icons come from lucide-react so the tags share the same visual
 *  weight (stroke width, joins, optical sizing) as every other glyph
 *  in the app — hand-rolled SVGs read as foreign next to the lucide
 *  family even when their proportions are close.
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
  const Icon = config.icon;
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
      <Icon size={iconSize} aria-hidden className="shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

const TAG_CONFIG: Record<
  UserTagId,
  { label: string; aria: string; icon: LucideIcon }
> = {
  og: {
    label: "OG",
    aria: "OG — founding member",
    // Compass reads as pioneering / early-explorer — the same intent
    // as the previous hand-rolled compass-rose SVG, now sharing the
    // lucide stroke language.
    icon: Compass,
  },
  owner: {
    label: "Owner",
    aria: "Owner",
    // Crown is the canonical authority/ownership glyph in lucide; it
    // replaces the earlier custom hex-signet so the chip reads next
    // to the rest of the app's icon vocabulary.
    icon: Crown,
  },
};
