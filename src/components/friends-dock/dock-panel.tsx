"use client";

import { Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DockData } from "./use-dock-data";
import { DirectorySkeleton, EmptyState, NoMatch } from "./dock-states";
import { MemberGroups, type Member } from "./member-row";
import { presenceCaption } from "./presence-label";

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="shrink-0 px-3 pb-2 pt-3">
      <div className="relative">
        <Search
          size={15}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search friends"
          aria-label="Search friends"
          className="h-11 bg-background pl-9 md:h-10"
        />
      </div>
    </div>
  );
}

/** Builds the unified, bucket-ordered directory: pending race invites,
 *  live broadcasters, then everyone you follow (online first). */
function useMembers(data: DockData): Member[] {
  const { live, challenges, directory, presenceById } = data;
  return useMemo<Member[]>(() => {
    const liveIds = new Set(live.map((u) => u.userId));
    const out: Member[] = [];
    for (const c of challenges) {
      out.push({
        key: `c:${c.id}`,
        href: `/race/c/${c.slug}`,
        src: null,
        icon: "swords",
        name: c.inviterName,
        tags: [],
        dot: null,
        caption: { label: "Wants to race", dotClass: null },
        action: "Join",
        bucket: 0,
        markReadId: c.id,
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
        caption: { label: `Typing at ${Math.round(u.wpm)} wpm`, dotClass: null },
        action: "Watch",
        bucket: 1,
      });
    }
    for (const u of directory) {
      if (liveIds.has(u.userId)) continue;
      const presence = presenceById.get(u.userId) ?? null;
      const online = !!presence?.online;
      out.push({
        key: `d:${u.userId}`,
        href: `/profile/${u.username ?? u.userId}`,
        src: u.imageUrl,
        name: u.name,
        tags: u.tags,
        dot: online ? "online" : null,
        caption: presence ? presenceCaption(presence) : null,
        action: null,
        bucket: online ? 2 : 3,
      });
    }
    return out.sort((a, b) => a.bucket - b.bucket);
  }, [live, challenges, directory, presenceById]);
}

/** The dock's content: one grouped directory inside a fixed-size frame —
 *  header, search, the list (race invites, live now, online, offline)
 *  and a "Find people" footer.
 *
 *  `withHeader` is true on desktop (the floating panel has no chrome of
 *  its own). On mobile the MobileSheet supplies the header, so the body
 *  renders without one. */
export function DockPanelBody({
  data,
  query,
  setQuery,
  onNavigate,
  onClose,
  withHeader = false,
}: {
  data: DockData;
  query: string;
  setQuery: (next: string) => void;
  onNavigate: () => void;
  onClose: () => void;
  withHeader?: boolean;
}) {
  const { directory, loading, markChallengeRead } = data;
  const members = useMembers(data);

  const q = query.trim().toLowerCase();
  const rows = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {withHeader ? (
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-3.5">
          <span className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Friends
            </h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {directory.length}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close friends"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "-mr-1.5 text-muted-foreground")}
          >
            <X size={16} aria-hidden />
          </button>
        </header>
      ) : null}
      <SearchBox value={query} onChange={setQuery} />
      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
        {loading && members.length === 0 ? (
          <DirectorySkeleton />
        ) : members.length === 0 ? (
          <EmptyState />
        ) : rows.length === 0 ? (
          <NoMatch query={query} />
        ) : (
          <MemberGroups rows={rows} onNavigate={onNavigate} onMarkRead={markChallengeRead} />
        )}
      </div>
      <footer className="shrink-0 border-t border-border/70 p-3">
        <Link
          href="/leaderboard"
          onClick={onNavigate}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full md:h-10")}
        >
          <UserPlus aria-hidden />
          Find people to follow
        </Link>
      </footer>
    </div>
  );
}
