"use client";

import { Swords } from "lucide-react";
import Link from "next/link";
import { Avatar, UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { UserTagId } from "@/types/user-tag";

/** One row of the dock directory — a pending race invite, a live
 *  broadcaster, or someone you follow. `bucket` orders and groups the
 *  rows (invites → live → online → offline). */
export type Member = {
  key: string;
  href: string;
  src: string | null;
  name: string;
  tags: readonly UserTagId[];
  icon?: "swords";
  dot: "live" | "online" | null;
  caption: { label: string; dotClass: string | null } | null;
  action: string | null;
  bucket: 0 | 1 | 2 | 3;
  /** When set, clicking the row marks this notification read (challenge
   *  rows — clears the dead invite from the dock + bell, FT-031). */
  markReadId?: string;
};

const GROUP_LABEL: Record<Member["bucket"], string> = {
  0: "Race invites",
  1: "Live now",
  2: "Online",
  3: "Offline",
};

function MemberRow({
  m,
  onNavigate,
  onMarkRead,
}: {
  m: Member;
  onNavigate: () => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <Link
      href={m.href}
      onClick={() => {
        if (m.markReadId) onMarkRead(m.markReadId);
        onNavigate();
      }}
      className="group flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-200 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
    >
      {m.icon === "swords" ? (
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {m.caption.dotClass ? (
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", m.caption.dotClass)}
              />
            ) : null}
            <span className="truncate tabular-nums">{m.caption.label}</span>
          </span>
        ) : null}
      </span>
      {m.action ? (
        // A tinted orange pill that fills on row hover: the row itself is
        // the link, this just names what the click does.
        <span className="inline-flex h-7 shrink-0 items-center rounded-pill bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
          {m.action}
        </span>
      ) : null}
    </Link>
  );
}

/** The directory, split into small sentence-case groups so it reads at
 *  a glance: race invites, live now, online, offline. Rows arrive
 *  pre-sorted by bucket. */
export function MemberGroups({
  rows,
  onNavigate,
  onMarkRead,
}: {
  rows: Member[];
  onNavigate: () => void;
  onMarkRead: (id: string) => void;
}) {
  const groups: { bucket: Member["bucket"]; rows: Member[] }[] = [];
  for (const m of rows) {
    const last = groups[groups.length - 1];
    if (last && last.bucket === m.bucket) last.rows.push(m);
    else groups.push({ bucket: m.bucket, rows: [m] });
  }
  return (
    <div className="flex flex-col gap-3 px-2 pb-2">
      {groups.map((g) => (
        <section key={g.bucket} aria-label={GROUP_LABEL[g.bucket]}>
          <h3 className="flex items-center gap-1.5 px-2.5 pb-1 text-xs font-medium text-muted-foreground">
            {GROUP_LABEL[g.bucket]}
            <span className="tabular-nums text-muted-foreground/70">
              {g.rows.length}
            </span>
          </h3>
          <ul className="flex flex-col">
            {g.rows.map((m) => (
              <li key={m.key}>
                <MemberRow m={m} onNavigate={onNavigate} onMarkRead={onMarkRead} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
