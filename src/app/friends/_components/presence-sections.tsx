"use client";

import Link from "next/link";
import { Avatar, UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { PresenceEntry } from "@/types/presence";
import { activityWord } from "./presence-label";

/** Eyebrow with a status dot + count, shared by both presence sections.
 *  The dot carries the section's meaning: coral pulse for live, ok-green
 *  for online. */
function SectionHeader({
  label,
  count,
  dotClass,
}: {
  label: string;
  count: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotClass)} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {count > 0 ? (
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </div>
  );
}

/** "Live now" — mutual friends currently broadcasting a practice run.
 *  The headline of the hub: big, coral, exciting. Each friend is a card
 *  (not a thin row) with their live WPM, a progress bar, and a filled
 *  "Watch live" button that opens the real spectate screen. The card
 *  shows a **static glimpse** only (WPM + progress) — it never streams a
 *  live preview here (that's reserved for the watch page, to save the
 *  poll/CPU). Two-up on `sm+` so the cards stay large. Hidden when
 *  nobody's live. */
export function LiveNow({ users }: { users: LiveFriend[] }) {
  if (users.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        label="Live now"
        count={users.length}
        dotClass="bg-primary motion-safe:animate-pulse"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {users.map((u) => (
          <li key={u.userId}>
            <LiveCard user={u} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LiveCard({ user }: { user: LiveFriend }) {
  const frac =
    user.totalChars > 0
      ? Math.min(1, Math.max(0, user.progressChars / user.totalChars))
      : 0;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar src={user.imageUrl} alt={user.name} size="lg" status="live" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-foreground sm:text-base">
              {user.name}
            </span>
            {user.tags.map((t) => (
              <UserTag key={t} tag={t} size="sm" />
            ))}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Typing now
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end leading-none">
          <span className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {Math.round(user.wpm)}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            wpm
          </span>
        </span>
      </div>
      <span
        aria-hidden
        className="block h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${frac * 100}%` }}
        />
      </span>
      <Link
        href={`/live/${user.userId}`}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Watch live
      </Link>
    </div>
  );
}

/** "Online" — people you follow who are online right now but not
 *  currently broadcasting. Glanceable only (no controls); rows link to
 *  the profile. A practising / racing friend gets a quiet activity word
 *  after the name (the green dot already says "online", so a plain-online
 *  friend stays bare). Hidden entirely when nobody's online, so the hub
 *  never stacks two empty cards. */
export function OnlineNow({
  users,
  presenceById,
}: {
  users: FriendUser[];
  presenceById: Map<string, PresenceEntry>;
}) {
  if (users.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader label="Online" count={users.length} dotClass="bg-ft-ok" />
      <ul className="flex flex-wrap gap-2">
        {users.map((u) => {
          const entry = presenceById.get(u.userId);
          const word = entry ? activityWord(entry) : null;
          return (
            <li key={u.userId}>
              <Link
                href={`/profile/${u.username ?? u.userId}`}
                className="group flex items-center gap-2 rounded-md border border-border bg-card py-1.5 pl-1.5 pr-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Avatar src={u.imageUrl} alt={u.name} size="sm" status="online" />
                <span className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
                  {u.name}
                </span>
                {word ? (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {word}
                  </span>
                ) : null}
                {u.tags.map((t) => (
                  <UserTag key={t} tag={t} size="sm" />
                ))}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
