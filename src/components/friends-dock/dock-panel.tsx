"use client";

import { Plus, Search, Swords, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar, UserTag } from "@/components/ft";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";
import type { DockData } from "./use-dock-data";
import { presenceCaption } from "./presence-label";

type Member = {
  key: string;
  href: string;
  src: string | null;
  name: string;
  tags: readonly UserTagId[];
  icon?: "swords";
  dot: "live" | "online" | null;
  caption: { label: string; dotClass: string | null } | null;
  action: string | null;
  bucket: number;
  /** The race_invite notification id for a challenge row — marked read on
   *  Join so the dock challenge + Swords badge don't persist pointing at a
   *  joined/dead lobby (FT-031). */
  notifId?: string;
};

function MemberRow({
  m,
  onNavigate,
  onAction,
}: {
  m: Member;
  onNavigate: () => void;
  onAction?: (m: Member) => void;
}) {
  return (
    <Link
      href={m.href}
      onClick={() => {
        onAction?.(m);
        onNavigate();
      }}
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
          <span className="truncate text-sm font-semibold text-foreground">
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

function MemberList({
  rows,
  onNavigate,
  onAction,
  className,
}: {
  rows: Member[];
  onNavigate: () => void;
  onAction?: (m: Member) => void;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-border/60", className)}>
      {rows.map((m) => (
        <li key={m.key}>
          <MemberRow m={m} onNavigate={onNavigate} onAction={onAction} />
        </li>
      ))}
    </ul>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="shrink-0 px-3 pb-3 pt-3">
      <div className="relative">
        <Search
          size={15}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
    </div>
  );
}

/** The dock's content: one directory inside a fixed-size frame —
 *  Friends header, search, then the unified list (pending challenges,
 *  live broadcasters, and everyone you follow, online AND offline).
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
  const { live, challenges, directory, presenceById, loading } = data;
  const backend = useBackend();

  // Joining a challenge marks its race_invite notification read so the
  // dock challenge row + the collapsed-pill Swords badge clear instead of
  // lingering on a lobby you've already joined (FT-031). Fire-and-forget;
  // the next dock poll reflects it.
  const onAction = (m: Member) => {
    if (m.notifId) void backend.notifications.markRead({ id: m.notifId });
  };

  const members = useMemo<Member[]>(() => {
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
        caption: {
          label: "wants to race",
          dotClass: "bg-primary",
        },
        action: "Join",
        bucket: 0,
        notifId: c.id,
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
    return out;
  }, [live, challenges, directory, presenceById]);

  const q = query.trim().toLowerCase();
  const byName = (m: Member) => m.name.toLowerCase().includes(q);
  // One unified list: pending challenges, live broadcasters, then the
  // full directory — online AND offline — ordered by bucket. Offline
  // friends are first-class here (ui-law §17.5: the directory lists
  // everyone you follow with a presence caption), so they no longer
  // hide behind a search or a separate sub-view.
  const rows = useMemo(
    () => [...members].sort((a, b) => a.bucket - b.bucket),
    [members],
  );
  const registered = directory.length;

  /* ─── Single panel body ─── */
  const panelBody = (
    <>
      {withHeader ? (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
              Friends
            </span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {registered}
            </span>
          </span>
          <span className="flex items-center gap-0.5">
            <Link
              href="/leaderboard"
              onClick={onNavigate}
              aria-label="Find people to follow"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus size={16} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close friends"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X size={16} aria-hidden />
            </button>
          </span>
        </header>
      ) : null}
      <SearchBox value={query} onChange={setQuery} placeholder="Search teammates…" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && members.length === 0 ? (
          <DirectorySkeleton />
        ) : members.length === 0 ? (
          <EmptyState />
        ) : q ? (
          (() => {
            const matches = rows.filter(byName);
            return matches.length === 0 ? (
              <NoMatch query={query} />
            ) : (
              <MemberList rows={matches} onNavigate={onNavigate} onAction={onAction} className="border-y border-border/60" />
            );
          })()
        ) : (
          <MemberList rows={rows} onNavigate={onNavigate} onAction={onAction} className="border-y border-border/60" />
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">{panelBody}</div>
  );
}

function NoMatch({ query }: { query: string }) {
  return (
    <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
      No one matches &ldquo;{query}&rdquo;.
    </p>
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
