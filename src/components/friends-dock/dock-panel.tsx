"use client";

import { Search, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar, UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { Duel } from "@/types/duel";
import type { FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { PresenceEntry } from "@/types/presence";
import type { DockData } from "./use-dock-data";
import { presenceCaption } from "./presence-label";

/** Section eyebrow: a status dot carries the meaning (coral pulse for
 *  live, swords glyph for challenges, muted dot for the directory). */
function SectionLabel({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

/** A live broadcaster — avatar with the lone coral pulse, name + tags,
 *  live WPM, and a quiet "Watch" affordance opening the spectate screen.
 *  Quiet (not a filled coral button) so N live friends don't paint N
 *  sparks (one-spark rule); the pulse dot already says "live". */
function LiveRow({ user, onNavigate }: { user: LiveFriend; onNavigate: () => void }) {
  return (
    <Link
      href={`/live/${user.userId}`}
      onClick={onNavigate}
      className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Avatar src={user.imageUrl} alt={user.name} size="sm" status="live" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {user.name}
          </span>
          {user.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="tabular-nums text-foreground">
            {Math.round(user.wpm)}
          </span>{" "}
          wpm
        </span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
        Watch
      </span>
    </Link>
  );
}

/** A pending incoming challenge — the whole row links to the duel screen
 *  where you race the challenger's ghost. Quiet "Accept" text, not a coral
 *  button. */
function ChallengeRow({ duel, onNavigate }: { duel: Duel; onNavigate: () => void }) {
  return (
    <Link
      href={`/duel/${duel.id}`}
      onClick={onNavigate}
      className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <Swords size={14} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {duel.challenger.name}
          </span>
          {duel.challenger.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          beat{" "}
          <span className="tabular-nums text-foreground">
            {Math.round(duel.challengerWpm)}
          </span>{" "}
          wpm
        </span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
        Accept
      </span>
    </Link>
  );
}

/** One person in the directory — glanceable only. Avatar (presence dot),
 *  name + tags, and a presence caption. The whole row links to their
 *  profile, where the follow control lives. */
function DirectoryRow({
  user,
  presence,
  onNavigate,
}: {
  user: FriendUser;
  presence?: PresenceEntry | null;
  onNavigate: () => void;
}) {
  const caption = presence ? presenceCaption(presence) : null;
  return (
    <Link
      href={`/profile/${user.username ?? user.userId}`}
      onClick={onNavigate}
      className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Avatar
        src={user.imageUrl}
        alt={user.name}
        size="sm"
        status={presence?.online ? "online" : null}
        dotRing="ring-popover"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
            {user.name}
          </span>
          {user.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        {caption ? (
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-1.5 shrink-0 rounded-full", caption.dotClass)}
            />
            <span className="tabular-nums">{caption.label}</span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** The dock's scrollable content: live now, pending challenges, and a
 *  searchable directory of friends + everyone you follow. Header chrome
 *  (title + close) is owned by the surrounding surface — the floating
 *  panel on desktop, the MobileSheet on mobile. */
export function DockPanelBody({
  data,
  query,
  setQuery,
  onNavigate,
}: {
  data: DockData;
  query: string;
  setQuery: (next: string) => void;
  /** Fired when a row navigates away, so the dock can close itself. */
  onNavigate: () => void;
}) {
  const { live, challenges, directory, presenceById, loading } = data;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((u) => u.name.toLowerCase().includes(q));
  }, [directory, query]);

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      {live.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel
            icon={
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
              />
            }
            label="Live now"
            count={live.length}
          />
          <ul className="flex flex-col gap-1.5">
            {live.map((u) => (
              <li key={u.userId}>
                <LiveRow user={u} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {challenges.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel
            icon={<Swords size={12} aria-hidden className="text-muted-foreground" />}
            label="Challenges"
            count={challenges.length}
          />
          <ul className="flex flex-col gap-1.5">
            {challenges.map((d) => (
              <li key={d.id}>
                <ChallengeRow duel={d} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <div className="relative">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        {loading && directory.length === 0 ? (
          <DirectorySkeleton />
        ) : directory.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-muted-foreground">
            No one matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((u) => (
              <li key={u.userId}>
                <DirectoryRow
                  user={u}
                  presence={presenceById.get(u.userId)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          href="/duels"
          onClick={onNavigate}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          All duels
        </Link>
        <Link
          href="/leaderboard"
          onClick={onNavigate}
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Find people
        </Link>
      </div>
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="flex flex-col gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
          <span className="size-8 shrink-0 rounded-full bg-muted" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-2.5 w-28 rounded-full bg-muted" />
            <span className="h-2 w-16 rounded-full bg-muted/70" />
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card/40 px-4 py-8 text-center">
      <Users size={18} aria-hidden className="text-muted-foreground" />
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        You&apos;re not following anyone yet. Find people on the leaderboard and
        follow them.
      </p>
    </div>
  );
}
