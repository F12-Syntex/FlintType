import { Check, Flame, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResultsPreview,
  RoundedPreview,
  SmarterPreview,
  StylePreview,
} from "./rehaul-previews";

/** Bespoke mini-mockups for the update advert card — small, recognisable
 *  snapshots of each feature, with real micro-copy (handles, WPM, a live
 *  passage, an Accept button) so each reads instantly. Built entirely
 *  from the fixed `ft-*` light tokens (§2.3) so they stay light inside
 *  the forced-light card. Purely decorative (aria-hidden); the one-word
 *  label beneath carries the meaning. */

function Initial({ children }: { children: string }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ft-ink/10 text-[9px] font-bold text-ft-dim">
      {children}
    </span>
  );
}

function HubRow({
  letter,
  handle,
  dot,
}: {
  letter: string;
  handle: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full ring-1 ring-inset ring-ft-line-soft bg-ft-paper py-1 pl-1 pr-2.5">
      <Initial>{letter}</Initial>
      <span className="text-[10px] font-semibold text-ft-ink">{handle}</span>
      <span className={cn("ml-auto size-1.5 shrink-0 rounded-full", dot)} />
    </div>
  );
}

/** Friends hub — a little people list with real handles + presence dots. */
function HubPreview() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-1.5">
      <HubRow letter="M" handle="@maya" dot="bg-ft-ember" />
      <HubRow letter="T" handle="@theo" dot="bg-ft-ok" />
      <HubRow letter="I" handle="@ines" dot="bg-ft-ink/15" />
    </div>
  );
}

/** Challenges — a race invite: who's asking, then a filled Join button
 *  on its own row so the tile reads cleanly even at phone width (a
 *  single row squeezed the caption one word per line). */
function ChallengesPreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-xl ring-1 ring-inset ring-ft-line-soft bg-ft-paper p-2.5"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ft-ember/10 text-ft-ember sm:size-7">
          <Swords size={13} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[11px] font-semibold text-ft-ink">@dao</span>
          <span className="truncate whitespace-nowrap text-[9px] font-medium text-ft-dim">
            wants to race
          </span>
        </span>
      </div>
      <span className="flex h-6 items-center justify-center rounded-full bg-ft-ember text-[10px] font-bold text-white">
        Join
      </span>
    </div>
  );
}

/** Spectate — a friend's live passage, typed words + caret + WPM. */
function SpectatePreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2.5 rounded-xl ring-1 ring-inset ring-ft-line-soft bg-ft-paper p-2.5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="size-1.5 shrink-0 rounded-full bg-ft-ember" />
        {/* The orange dot carries "live" on small tiles. */}
        <span className="hidden text-[9px] font-bold text-ft-ember sm:inline">
          Live
        </span>
        <span className="min-w-0 truncate text-[10px] font-semibold text-ft-ink">@maya</span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] font-semibold tabular-nums text-ft-ink">
          92 <span className="font-medium text-ft-dim">wpm</span>
        </span>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-medium leading-none">
        <span className="text-ft-ink">the</span>
        <span className="text-ft-ink">quick</span>
        <span aria-hidden className="inline-block h-3 w-px bg-ft-ember" />
        <span className="text-ft-dim/50">brown</span>
        <span className="text-ft-dim/50">fox</span>
      </div>
    </div>
  );
}

/** Profile — avatar + rank flair, headline stats, XP bar. Stacked so
 *  it reads at phone width too (one row squeezed the handle to "@"). */
function ProfilePreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-xl ring-1 ring-inset ring-ft-line-soft bg-ft-paper p-2.5 sm:p-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ft-ink/10 text-[10px] font-bold text-ft-dim sm:size-7">
          Y
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[11px] font-semibold text-ft-ink">@you</span>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ft-ember/10 px-1.5 py-px text-[8px] font-bold text-ft-ember">
            <Flame size={8} /> Forge
          </span>
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2 whitespace-nowrap text-[10px] tabular-nums text-ft-dim">
        <span>
          <span className="font-bold text-ft-ink">128</span> wpm
        </span>
        <span className="font-bold text-ft-ink">97%</span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-ft-ink/10">
        <span className="block h-full w-[68%] rounded-full bg-ft-ember" />
      </span>
    </div>
  );
}

/** The actual flint-stone racer SVG (from `/public/stone-assets`) — the
 *  real asset the race screen rides, not a stand-in. `you` paints the
 *  coral drop-shadow that marks the local racer on the track. One
 *  eslint-disable for the whole file's worth of stones. */
function Stone({
  name,
  you,
  className,
}: {
  name: string;
  you?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/stone-assets/${name}.svg`}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("select-none", className)}
      style={
        you
          ? {
              filter:
                "drop-shadow(0 0 5px color-mix(in oklch, var(--color-ft-ember) 70%, transparent))",
            }
          : undefined
      }
    />
  );
}

/** One race lane: a ground line, a scorch trail from the start, a finish
 *  post on the right, and the flint stone gliding to its progress mark —
 *  the same anatomy the live racetrack uses. */
function StoneLane({
  name,
  pct,
  you,
}: {
  name: string;
  pct: number;
  you?: boolean;
}) {
  const ink = you ? "var(--color-ft-ember)" : "var(--color-ft-ink)";
  return (
    <div className="relative h-7">
      <span
        className="absolute inset-x-0 bottom-1.5 h-px"
        style={{ backgroundColor: ink, opacity: you ? 0.5 : 0.14 }}
      />
      <span
        className="absolute bottom-1.5 left-0 h-[2px] rounded-full"
        style={{ width: `${pct}%`, backgroundColor: ink, opacity: you ? 0.5 : 0.25 }}
      />
      <span className="absolute right-0 bottom-1 h-5 w-px bg-ft-ink/30" />
      <span
        className="absolute bottom-0.5 -translate-x-1/2"
        style={{ left: `${pct}%` }}
      >
        <Stone name={name} you={you} className="size-7" />
      </span>
    </div>
  );
}

/** Racetrack — flint-stone racers riding their lanes toward the finish.
 *  Your stone (top) carries the coral spark and a hotter tier out in
 *  front; the field trails behind on quieter tiers. The headline. */
function RacetrackPreview() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-0.5">
      <StoneLane name="blaze" pct={80} you />
      <StoneLane name="ember" pct={54} />
      <StoneLane name="spark" pct={30} />
    </div>
  );
}

/** Ignite — the new fire progression. The same stone gets hotter as the
 *  WPM climbs, pebble through inferno, so the field visibly catches
 *  fire as it speeds up. */
function IgnitePreview() {
  const tiers = ["pebble", "ember", "blaze", "inferno"] as const;
  return (
    <div aria-hidden className="flex w-full flex-col gap-1.5">
      <div className="flex items-end justify-between">
        {tiers.map((name) => (
          <Stone key={name} name={name} className="size-7 sm:size-9" />
        ))}
      </div>
      <span className="h-px bg-ft-line-soft" />
      <div className="flex items-center justify-between text-[9px] font-semibold text-ft-dim">
        <span>Slow</span>
        <span>Fast</span>
      </div>
    </div>
  );
}

/** A single squashed-bug line. */
function FixLine({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Check size={10} className="shrink-0 text-ft-ok" />
      <span className="text-[9px] font-medium text-ft-ink">{children}</span>
    </div>
  );
}

/** Fixes — a short checklist of squashed bugs. No coral; success ink only. */
function FixesPreview() {
  return (
    <div aria-hidden className="flex w-fit flex-col gap-1.5">
      <FixLine>Error counts agree</FixLine>
      <FixLine>Net + raw WPM match</FixLine>
      <FixLine>Tab no longer resets</FixLine>
    </div>
  );
}

/** Keyed map the update card renders by `highlight.preview`. */
export const UPDATE_PREVIEWS: Record<string, React.ComponentType> = {
  hub: HubPreview,
  challenges: ChallengesPreview,
  spectate: SpectatePreview,
  profile: ProfilePreview,
  racetrack: RacetrackPreview,
  ignite: IgnitePreview,
  fixes: FixesPreview,
  rounded: RoundedPreview,
  results: ResultsPreview,
  style: StylePreview,
  smarter: SmarterPreview,
};
