"use client";

import { Compass, Crown, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
 *  weight as every other glyph in the app. Stroke width is bumped to
 *  2.25 (above lucide's default 2) because the chip is rendered at
 *  11–13px and the default stroke reads thin against the saturated
 *  fill at that size.
 *
 *  Hover tooltip — every chip ships with a one-line description that
 *  surfaces on hover/focus (Monkeytype-style). The trigger is the
 *  chip itself; the tooltip uses the project's shadcn `Tooltip`
 *  primitive so the popover styling is consistent with the rest of
 *  the app. Set `tooltip={false}` to opt out when the chip is itself
 *  inside a button whose own affordance describes it (rare).
 *
 *  Sizes:
 *    - `sm` — leaderboard-row scale (h-5, text-[10px])
 *    - `md` — profile-hero scale   (h-[26px], text-[11px])
 *
 *  No animation. The "glow" is a static box-shadow stored on the
 *  per-tag `--ft-tag-<id>-glow` custom property. */
export function UserTag({
  tag,
  size = "sm",
  className,
  tooltip = true,
}: {
  tag: UserTagId;
  size?: "sm" | "md";
  className?: string;
  tooltip?: boolean;
}) {
  const config = TAG_CONFIG[tag];
  // Slightly more breathing room than the previous tight build so
  // icon + label don't crowd at small sizes. Vertical alignment uses
  // leading-none so the chip's intrinsic height matches the h-* class.
  const sizeClass =
    size === "md"
      ? "h-[26px] gap-1.5 px-2.5 text-[11px]"
      : "h-5 gap-1 px-2 text-[10px]";
  const iconSize = size === "md" ? 14 : 12;
  const Icon = config.icon;
  const chip = (
    <span
      role="img"
      aria-label={config.aria}
      className={cn(
        "inline-flex cursor-pointer items-center whitespace-nowrap rounded-md border font-semibold uppercase leading-none tracking-[0.12em]",
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
      <Icon
        size={iconSize}
        strokeWidth={2.25}
        aria-hidden
        className="shrink-0"
      />
      <span>{config.label}</span>
    </span>
  );
  if (!tooltip) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="px-2.5 py-1.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            {config.tooltipTitle}
          </span>
          <span className="text-xs text-muted-foreground">
            {config.tooltipDescription}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const TAG_CONFIG: Record<
  UserTagId,
  {
    label: string;
    aria: string;
    icon: LucideIcon;
    tooltipTitle: string;
    tooltipDescription: string;
  }
> = {
  og: {
    label: "OG",
    aria: "OG — founding member",
    icon: Compass,
    tooltipTitle: "OG",
    tooltipDescription:
      "Founding member — joined within the first 1000 users.",
  },
  owner: {
    label: "Owner",
    aria: "Owner",
    icon: Crown,
    tooltipTitle: "Owner",
    tooltipDescription: "Creator and maintainer of flinttype.",
  },
};
