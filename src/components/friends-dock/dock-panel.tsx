"use client";

import { Search, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar, UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";
import type { DockData } from "./use-dock-data";
import { presenceCaption } from "./presence-label";

/** One row's worth of data, normalised across the three sources (live
 *  broadcasters, pending challenges, directory) so the panel renders a
 *  single uniform list — the reference's "Active Members" shape. */
type Member = {
  key: string;
  href: string;
  src: string | null;
  name: string;
  tags: readonly UserTagId[];
  /** A challenge has no avatar — render a swords glyph tile in the
   *  avatar slot instead so it still reads as a person-shaped row. */
  icon?: "swords";
  /** Avatar presence dot: coral pulse (live), ok-green (online), none. */
  dot: "live" | "online" | null;
  /** Status line under the name: a dot + a short label. */
  caption: { label: string; dotClass: string | null } | null;
  /** Right-aligned action chip — the only thing in that slot, and only
   *  on actionable rows (Watch a live run, Accept a challenge). Plain
   *  directory rows carry no chip; their status lives in the caption. */
  action: string | null;
  /** Sort bucket: challenges, then live, then online, then offline. */
  bucket: number;
};

/** A single member row — the shared shape for every entry in the list.
 *  Avatar with presence dot, name + identity tags, a status caption,
 *  and an optional right-aligned action chip. The whole row is a link. */
function MemberRow({ m, onNavigate }: { m: Member; onNavigate: () => void }) {
  return (
    <Link
      href={m.href}
      onClick={onNavigate}
      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
    >
      {m.icon === "swords" ? (
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
          <Swords size={16} aria-hidden />
        </span>
      ) : (
        <Avatar src={m.src} alt={m.name} size="md" status={m.dot} dotRing="ring-popover" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            {m.name}
          </span>
          {m.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        {m.caption ? (
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {m.caption.dotClass ? (
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", m.caption.dotClass)}
              />
            ) : null}
            <span className="tabular-nums">{m.caption.label}</span>
          </span>
        ) : null}
      </span>
      {m.action ? (
        <span className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:border-foreground/40 group-hover:text-foreground">
          {m.action}
        </span>
      ) : null}
    </Link>
  );
}

/** The dock's content: a search box, one status-sorted member list
 *  (challenges → live → online → offline) rendered as the reference's
 *  "Active Members" card in flinttype's editorial language, and a
 *  "Member directory" footer row. Title + count + close chrome is
 *  owned by the surrounding surface (floating panel / MobileSheet). */
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

  const members = useMemo<Member[]>(() => {
    const liveIds = new Set(live.map((u) => u.userId));
    const out: Member[] = [];

    for (const d of challenges) {
      out.push({
        key: `c:${d.id}`,
        href: `/duel/${d.id}`,
        src: null,
        icon: "swords",
        name: d.challenger.name,
        tags: d.challenger.tags,
        dot: null,
        caption: {
          label: `beat ${Math.round(d.challengerWpm)} wpm`,
          dotClass: "bg-primary",
        },
        action: "Accept",
        bucket: 0,
      });
    }
    for (const u of live) {
      out.push({
        key: `l:${u.userId}`,
        href: `/live/${u.userId}`,
        src: u.imageUrl,
        name: u.name,
        tags: u.tags,
        dot: "live",
        caption: { label: `${Math.round(u.wpm)} wpm`, dotClass: null },
        action: "Watch",
        bucket: 1,
      });
    }
    for (const u of directory) {
      if (liveIds.has(u.userId)) continue;
      const presence = presenceById.get(u.userId) ?? null;
      const online = !!presence?.online;
      const caption = presence ? presenceCaption(presence) : null;
      out.push({
        key: `d:${u.userId}`,
        href: `/profile/${u.username ?? u.userId}`,
        src: u.imageUrl,
        name: u.name,
        tags: u.tags,
        dot: online ? "online" : null,
        caption,
        action: null,
        bucket: online ? 2 : 3,
      });
    }
    return out;
  }, [live, challenges, directory, presenceById]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? members.filter((m) => m.name.toLowerCase().includes(q))
      : members;
    return [...rows].sort((a, b) => a.bucket - b.bucket);
  }, [members, query]);

  const registered = directory.length;
  const stack = directory.slice(0, 3);
  const overflow = Math.max(0, registered - stack.length);

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-3 pb-3 pt-1">
        <div className="relative">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teammates…"
            aria-label="Search teammates"
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
      </div>

      {/* Member list */}
      {loading && members.length === 0 ? (
        <DirectorySkeleton />
      ) : members.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
          No one matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {filtered.map((m) => (
            <li key={m.key}>
              <MemberRow m={m} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}

      {/* Member directory footer */}
      {registered > 0 ? (
        <div className="p-3">
          <Link
            href="/leaderboard"
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
              <Users size={16} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                Member directory
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                {registered} {registered === 1 ? "person" : "people"} you follow
              </span>
            </span>
            {stack.length > 0 ? (
              <span className="flex shrink-0 items-center">
                <span className="flex -space-x-2">
                  {stack.map((u) => (
                    <Avatar
                      key={u.userId}
                      src={u.imageUrl}
                      alt={u.name}
                      size="sm"
                      liven={false}
                      dotRing="ring-card"
                    />
                  ))}
                </span>
                {overflow > 0 ? (
                  <span className="z-10 -ml-2 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold tabular-nums text-muted-foreground ring-1 ring-foreground/10">
                    +{overflow}
                  </span>
                ) : null}
              </span>
            ) : null}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border/60 border-y border-border/60" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <span className="size-10 shrink-0 rounded-full bg-muted" />
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
    <div className="mx-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-card/40 px-4 py-8 text-center">
      <Swords size={18} aria-hidden className="text-muted-foreground" />
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        You&apos;re not following anyone yet. Find people on the leaderboard and
        follow them.
      </p>
    </div>
  );
}
