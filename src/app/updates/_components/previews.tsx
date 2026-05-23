import { Flame, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center gap-2 rounded-md border border-ft-line-soft bg-ft-paper px-2 py-1.5">
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

/** Challenges — the inline race-invite row with a filled Join button. */
function ChallengesPreview() {
  return (
    <div
      aria-hidden
      className="flex w-full items-center gap-2.5 rounded-md border border-ft-line-soft bg-ft-paper px-3 py-2.5"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ft-ember/10 text-ft-ember">
        <Swords size={15} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-semibold text-ft-ink">@dao</span>
        <span className="text-[9px] font-medium text-ft-dim">wants to race</span>
      </span>
      <span className="ml-auto rounded-md bg-ft-ember px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-ft-paper">
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
      className="flex w-full flex-col gap-2.5 rounded-md border border-ft-line-soft bg-ft-paper p-2.5"
    >
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-ft-ember" />
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-ft-ember">
          Live
        </span>
        <span className="text-[10px] font-semibold text-ft-ink">@maya</span>
        <span className="ml-auto text-[10px] font-semibold tabular-nums text-ft-ink">
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

/** Profile — avatar, rank flair, headline stats, XP bar. */
function ProfilePreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2.5 rounded-md border border-ft-line-soft bg-ft-paper p-3"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ft-ink/10 text-[10px] font-bold text-ft-dim">
          Y
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-ft-ink">@you</span>
          <span className="inline-flex w-fit items-center gap-1 rounded border border-ft-ember/30 bg-ft-ember/10 px-1 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-ft-ember">
            <Flame size={8} /> Forge
          </span>
        </span>
        <span className="ml-auto flex flex-col items-end gap-0.5 text-[10px] tabular-nums text-ft-dim">
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
