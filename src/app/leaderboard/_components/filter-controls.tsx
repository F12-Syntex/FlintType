"use client";

import { CalendarDays, ChevronDown, Ruler } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  ALL_LENGTHS_LABEL,
  DEFAULT_PRESET,
  type LeaderboardAudience,
  type LeaderboardFilters,
  PRESET_GROUPS,
  presetLabel,
  SCOPES,
  WINDOWS,
} from "./filters";
import type { SetLeaderboardFilters } from "./use-leaderboard-params";

/** Shared sizing for every switch in the toolbar. On phones the touch
 *  target is the segment itself: 40px segments in a slim `p-0.5` track
 *  (~46px, the §17.2 recipe), so a tap on the track edge still lands on
 *  a segment. From md it is a 40px track matching the dropdown pills. */
export const TOOLBAR_SWITCH =
  "flex-nowrap p-0.5 md:h-10 md:p-1 [&>button]:h-10 [&>button]:py-0 md:[&>button]:h-full";

export const AUDIENCES: readonly { value: LeaderboardAudience; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "friends", label: "Friends" },
];

/** Desktop (md+) filter row: Mode, Window, Length and, when signed in,
 *  Global / Friends. Rendered with `display: contents` so each control
 *  wraps on its own inside the toolbar row. */
export function InlineFilters({
  filters,
  setFilters,
  signedIn,
}: {
  filters: LeaderboardFilters;
  setFilters: SetLeaderboardFilters;
  signedIn: boolean;
}) {
  return (
    <div className="hidden md:contents">
      <span aria-hidden className="mx-1 hidden h-6 w-px bg-border lg:block" />
      <SegmentedControl
        ariaLabel="Mode"
        value={filters.scope}
        onValueChange={(scope) => setFilters({ scope })}
        options={SCOPES.map((s) => ({ value: s.id, label: s.label }))}
        className={TOOLBAR_SWITCH}
      />
      <PillMenu
        icon={<CalendarDays aria-hidden />}
        label={WINDOWS.find((w) => w.id === filters.window)?.label ?? "All time"}
        ariaLabel="Time window"
        changed={filters.window !== "all_time"}
      >
        {WINDOWS.map((w) => (
          <MenuOption
            key={w.id}
            checked={w.id === filters.window}
            onSelect={() => setFilters({ window: w.id })}
          >
            {w.label}
          </MenuOption>
        ))}
      </PillMenu>
      <PillMenu
        icon={<Ruler aria-hidden />}
        label={presetLabel(filters.preset)}
        ariaLabel="Test length"
        changed={filters.preset !== DEFAULT_PRESET}
      >
        <MenuOption
          checked={filters.preset === "any"}
          onSelect={() => setFilters({ preset: "any" })}
        >
          {ALL_LENGTHS_LABEL}
        </MenuOption>
        {PRESET_GROUPS.map((g) => (
          <div key={g.title} role="group" aria-label={g.title}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="pl-8">
              {g.title}
            </DropdownMenuLabel>
            {g.options.map((o) => (
              <MenuOption
                key={o.id}
                checked={o.id === filters.preset}
                onSelect={() => setFilters({ preset: o.id })}
              >
                {o.label}
              </MenuOption>
            ))}
          </div>
        ))}
      </PillMenu>
      {signedIn ? (
        <SegmentedControl
          ariaLabel="Whose runs"
          value={filters.audience}
          onValueChange={(audience) => setFilters({ audience })}
          options={AUDIENCES}
          className={TOOLBAR_SWITCH}
        />
      ) : null}
    </div>
  );
}

/** A select rendered as an outline pill that opens a dropdown menu.
 *  `changed` (value moved off its default) tints the pill orange, so
 *  you can see at a glance which dropdowns are shaping the board. */
function PillMenu({
  icon,
  label,
  ariaLabel,
  changed,
  children,
}: {
  icon: ReactNode;
  label: string;
  ariaLabel: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${ariaLabel}: ${label}`}
          className={cn(
            "h-10 gap-2 px-4",
            changed
              ? "border-primary/40 bg-primary/[0.06] hover:bg-primary/10 [&>svg]:text-primary"
              : "[&>svg]:text-muted-foreground",
          )}
        >
          {icon}
          <span
            className={cn(
              changed ? "font-semibold text-primary" : "text-foreground",
            )}
          >
            {label}
          </span>
          <ChevronDown aria-hidden className="-mr-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One single-choice option; the selected one carries an orange check. */
function MenuOption({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={() => onSelect()}
      className={cn(
        "[&_svg]:text-primary",
        checked && "font-medium text-primary focus:text-primary",
      )}
    >
      {children}
    </DropdownMenuCheckboxItem>
  );
}
