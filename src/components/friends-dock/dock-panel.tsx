"use client";

import { ArrowLeft, Plus, Search, Swords, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Avatar, UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";
import type { DockData } from "./use-dock-data";
import { presenceCaption } from "./presence-label";

export type DockView = "active" | "directory";

/** One row's worth of data, normalised across the three sources (live
 *  broadcasters, pending challenges, directory) so every list renders
 *  the same uniform row. */
type Member = {
  key: string;
  href: string;
  src: string | null;
  name: string;
  tags: readonly UserTagId[];
  /** A challenge has no avatar — render a swords glyph tile instead. */
  icon?: "swords";
  dot: "live" | "online" | null;
  caption: { label: string; dotClass: string | null } | null;
  /** Right-aligned action chip (Watch a live run / Accept a challenge). */
  action: string | null;
  /** Sort bucket: challenges, then live, then online, then offline. */
  bucket: number;
};

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
  className,
}: {
  rows: Member[];
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-border/60", className)}>
      {rows.map((m) => (
        <li key={m.key}>
          <MemberRow m={m} onNavigate={onNavigate} />
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
    <div className="px-3 pb-3 pt-3">
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

/** The dock's content. Two views inside one panel:
 *   - "active":    Active-members header, search, the live/online list,
 *                  and a Member-directory bar at the bottom.
 *   - "directory": the bar takes over — its header replaces the title,
 *                  the content area is replaced by the full follow list
 *                  (the reference's img1 → img2). Closing the directory
 *                  view (X / back) returns to active.
 *
 *  `withHeader` is true on desktop (the floating panel has no chrome of
 *  its own, so the body owns the header + scroll). On mobile the
 *  MobileSheet supplies the header + scroll, so the body renders bare. */
export function DockPanelBody({
  data,
  query,
  setQuery,
  onNavigate,
  view,
  setView,
  onClose,
  withHeader = false,
}: {
  data: DockData;
  query: string;
  setQuery: (next: string) => void;
  onNavigate: () => void;
  view: DockView;
  setView: (next: DockView) => void;
  onClose: () => void;
  withHeader?: boolean;
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
  const active = useMemo(
    () => members.filter((m) => m.bucket <= 2).sort((a, b) => a.bucket - b.bucket),
    [members],
  );
  const directoryRows = useMemo(
    () => members.filter((m) => m.bucket >= 1).sort((a, b) => a.bucket - b.bucket),
    [members],
  );

  const registered = directory.length;
  const activeCount = members.filter((m) => m.bucket === 1 || m.bucket === 2).length;
  const stack = directory.slice(0, 3);
  const overflow = Math.max(0, registered - stack.length);

  /* ─── Headers (desktop only; mobile uses the sheet's header) ─── */
  const header = !withHeader ? null : view === "active" ? (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
      <span className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
          Friends
        </span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
          {activeCount}
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
  ) : (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-3">
      <span className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setView("active")}
          aria-label="Back to friends"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            Member directory
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
            {registered} {registered === 1 ? "person" : "people"}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close friends"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X size={16} aria-hidden />
      </button>
    </header>
  );

  /* ─── Body per view ─── */
  let body: ReactNode;
  if (loading && members.length === 0) {
    body = (
      <>
        <SearchBox value={query} onChange={setQuery} placeholder="Search teammates…" />
        <DirectorySkeleton />
      </>
    );
  } else if (members.length === 0) {
    body = (
      <>
        <SearchBox value={query} onChange={setQuery} placeholder="Search teammates…" />
        <EmptyState />
      </>
    );
  } else if (view === "directory") {
    const rows = q ? directoryRows.filter(byName) : directoryRows;
    body = (
      <>
        <SearchBox value={query} onChange={setQuery} placeholder="Search members…" />
        {rows.length === 0 ? (
          <NoMatch query={query} />
        ) : (
          <MemberList rows={rows} onNavigate={onNavigate} className="border-t border-border/60" />
        )}
      </>
    );
  } else {
    // Active view. A query searches everyone (flat) and hides the bar;
    // otherwise show the active list + the directory bar.
    const matches = q ? members.filter(byName) : null;
    body = (
      <>
        <SearchBox value={query} onChange={setQuery} placeholder="Search teammates…" />
        {matches ? (
          matches.length === 0 ? (
            <NoMatch query={query} />
          ) : (
            <MemberList rows={matches} onNavigate={onNavigate} className="border-y border-border/60" />
          )
        ) : (
          <>
            {active.length > 0 ? (
              <MemberList rows={active} onNavigate={onNavigate} className="border-y border-border/60" />
            ) : (
              <p className="border-y border-border/60 px-3 py-6 text-center text-[12px] text-muted-foreground">
                No one&apos;s active right now.
              </p>
            )}
            {registered > 0 ? (
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => setView("directory")}
                  className="group flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                    <Users size={16} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">
                      Member directory
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                      {registered} {registered === 1 ? "person" : "people"}
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
                </button>
              </div>
            ) : null}
          </>
        )}
      </>
    );
  }

  // Desktop: header sits above a scrollable body. Mobile: the sheet
  // already provides the header + scroll, so render the body bare.
  if (withHeader) {
    return (
      <>
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </>
    );
  }
  return <>{body}</>;
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
