import { Eye, Flame, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bespoke mini-mockups for the update advert card — small, recognisable
 *  snapshots of each feature, not boilerplate icons. Built entirely from
 *  the fixed `ft-*` light tokens (§2.3) so they stay light inside the
 *  forced-light card regardless of the user's theme. Purely decorative
 *  (aria-hidden); the title + blurb beside them carry the meaning. */

function HubRow({ w, dot }: { w: string; dot: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-ft-line-soft bg-ft-paper px-2 py-1.5">
      <span className="size-4 shrink-0 rounded-full bg-ft-ink/15" />
      <span className={cn("h-1.5 rounded-full bg-ft-ink/15", w)} />
      <span className={cn("ml-auto size-1.5 shrink-0 rounded-full", dot)} />
    </div>
  );
}

/** Friends hub — a little people list with presence dots. */
function HubPreview() {
  return (
    <div aria-hidden className="flex w-full flex-col gap-1.5">
      <HubRow w="w-20" dot="bg-ft-ember" />
      <HubRow w="w-12" dot="bg-ft-ok" />
      <HubRow w="w-16" dot="bg-ft-ink/15" />
    </div>
  );
}

/** Challenges — the inline duel row with an Accept pill. */
function ChallengesPreview() {
  return (
    <div
      aria-hidden
      className="flex w-full items-center gap-2.5 rounded-md border border-ft-line-soft bg-ft-paper px-3 py-2.5"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ft-ember/10 text-ft-ember">
        <Swords size={15} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="h-1.5 w-16 rounded-full bg-ft-ink/20" />
        <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-ft-dim">
          beat 104 wpm
        </span>
      </span>
      <span className="ml-auto rounded-md bg-ft-ember/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-ft-ember">
        Accept
      </span>
    </div>
  );
}

/** Spectate — a friend's live passage with a caret + WPM. */
function SpectatePreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-md border border-ft-line-soft bg-ft-paper p-2.5"
    >
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-ft-ember" />
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-ft-ember">
          Live
        </span>
        <span className="ml-auto text-[9px] font-semibold tabular-nums text-ft-ink">
          92 <span className="text-ft-dim">wpm</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-6 rounded-full bg-ft-ink/25" />
        <span className="h-1.5 w-9 rounded-full bg-ft-ink/25" />
        <span className="h-3 w-0.5 bg-ft-ember" />
        <span className="h-1.5 w-7 rounded-full bg-ft-ink/12" />
        <span className="h-1.5 w-5 rounded-full bg-ft-ink/12" />
      </div>
      <div className="flex items-center gap-1 text-[8px] font-medium uppercase tracking-[0.12em] text-ft-dim">
        <Eye size={10} /> Watching
      </div>
    </div>
  );
}

/** Profile — avatar, rank flair, XP bar, headline stats. */
function ProfilePreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-md border border-ft-line-soft bg-ft-paper p-3"
    >
      <div className="flex items-center gap-2">
        <span className="size-7 shrink-0 rounded-full bg-ft-ink/15" />
        <span className="flex flex-col gap-1">
          <span className="h-1.5 w-12 rounded-full bg-ft-ink/20" />
          <span className="inline-flex w-fit items-center gap-1 rounded border border-ft-ember/30 bg-ft-ember/10 px-1 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-ft-ember">
            <Flame size={8} /> Forge
          </span>
        </span>
        <span className="ml-auto flex flex-col items-end gap-0.5 text-[9px] tabular-nums text-ft-dim">
          <span>
            <span className="font-bold text-ft-ink">128</span> wpm
          </span>
          <span className="font-bold text-ft-ink">97%</span>
        </span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-ft-ink/10">
        <span className="block h-full w-[68%] rounded-full bg-ft-ember" />
      </span>
    </div>
  );
}

/** Keyed map the update card renders by `highlight.preview`. */
export const UPDATE_PREVIEWS: Record<string, React.ComponentType> = {
  hub: HubPreview,
  challenges: ChallengesPreview,
  spectate: SpectatePreview,
  profile: ProfilePreview,
};
