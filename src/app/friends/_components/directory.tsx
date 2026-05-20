"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronUp, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { FriendRelationship, FriendUser } from "@/types/friends";
import { FriendListRow } from "./friend-list-row";

type TabId = "friends" | "following" | "followers";

const TABS: { id: TabId; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "following", label: "Following" },
  { id: "followers", label: "Followers" },
];

const EMPTY_COPY: Record<TabId, string> = {
  friends:
    "No friends yet. When someone you follow follows you back, they land here.",
  following:
    "You're not following anyone yet. Find people on the leaderboard and follow them.",
  followers: "No followers yet. Share your profile and they'll show up here.",
};

export type DirectoryLists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** The whole graph, tucked into a docked bar that springs open into a
 *  sheet. The bar lives in the content flow (so it never fights the app
 *  footer); opening portals a backdrop + a bottom-anchored panel that
 *  slides up. Friends / Following / Followers behind a segmented control,
 *  searchable, with the full relationship controls. Motion is the
 *  sanctioned full-fidelity exception (ui-law §17.5) and collapses to a
 *  static reveal under `prefers-reduced-motion`. */
export function Directory({
  lists,
  relationshipFor,
  onlineIds,
  onChange,
}: {
  lists: DirectoryLists;
  relationshipFor: (userId: string) => FriendRelationship;
  onlineIds: Set<string>;
  onChange: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("friends");
  const [q, setQ] = useState("");
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Unique people across all three lists — drives the bar's avatar stack
  // and count. Following order first (most representative), then any
  // followers not already seen.
  const union = useMemo(() => {
    const seen = new Set<string>();
    const out: FriendUser[] = [];
    for (const u of [...lists.following, ...lists.followers, ...lists.friends]) {
      if (seen.has(u.userId)) continue;
      seen.add(u.userId);
      out.push(u);
    }
    return out;
  }, [lists]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = lists[tab];
    if (!needle) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(needle) ||
        (u.username ?? "").toLowerCase().includes(needle),
    );
  }, [lists, tab, q]);

  const counts: Record<TabId, number> = {
    friends: lists.friends.length,
    following: lists.following.length,
    followers: lists.followers.length,
  };

  const spring = reduce
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 380, damping: 38, mass: 0.85 } as const);

  const listVariants = {
    show: { transition: { staggerChildren: reduce ? 0 : 0.025 } },
  };
  const itemVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
      };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group flex w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-transform group-hover:scale-105">
            <Users size={18} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              Directory
            </span>
            <span className="text-[11px] text-muted-foreground">
              {union.length} {union.length === 1 ? "person" : "people"}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {union.length > 0 ? (
            <span className="flex -space-x-2">
              {union.slice(0, 3).map((u) => (
                <Avatar
                  key={u.userId}
                  src={u.imageUrl}
                  alt={u.name}
                  size="sm"
                  liven={false}
                  className="ring-2 ring-card [&_img]:ring-0"
                />
              ))}
              {union.length > 3 ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground ring-2 ring-card">
                  +{union.length - 3}
                </span>
              ) : null}
            </span>
          ) : null}
          <ChevronUp
            size={16}
            className="text-muted-foreground transition-transform group-hover:-translate-y-0.5"
            aria-hidden
          />
        </span>
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div className="fixed inset-0 z-50">
                  <motion.button
                    type="button"
                    aria-label="Close directory"
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-foreground/45 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Friend directory"
                    className="safe-pb absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card text-foreground shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.35)] sm:bottom-3 sm:rounded-2xl"
                    initial={reduce ? { opacity: 0 } : { y: "100%" }}
                    animate={reduce ? { opacity: 1 } : { y: 0 }}
                    exit={reduce ? { opacity: 0 } : { y: "100%" }}
                    transition={spring}
                  >
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setOpen(false)}
                      className="flex h-5 items-center justify-center pt-2"
                    >
                      <span
                        aria-hidden
                        className="h-1 w-9 rounded-full bg-foreground/20"
                      />
                    </button>
                    <header className="flex items-center justify-between gap-3 px-4 pt-1 pb-3">
                      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                        <Users size={18} aria-hidden /> Directory
                      </h2>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    </header>

                    <div className="flex flex-col gap-3 px-4 pb-3">
                      <div
                        role="tablist"
                        aria-label="Friend lists"
                        className="flex gap-1 rounded-md border border-border bg-muted/40 p-1"
                      >
                        {TABS.map((t) => {
                          const active = t.id === tab;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setTab(t.id)}
                              className={cn(
                                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                                active
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {t.label}
                              <span className="tabular-nums text-muted-foreground">
                                {counts[t.id]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative">
                        <Search
                          size={15}
                          aria-hidden
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Search by handle"
                          aria-label="Search the directory"
                          className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        />
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                      {filtered.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
                          {q.trim()
                            ? "No one here matches that handle."
                            : EMPTY_COPY[tab]}
                        </p>
                      ) : (
                        <motion.ul
                          key={tab}
                          variants={listVariants}
                          initial="hidden"
                          animate="show"
                          className="flex flex-col gap-2"
                        >
                          {filtered.map((u) => (
                            <motion.li key={u.userId} variants={itemVariants}>
                              <FriendListRow
                                user={u}
                                relationship={relationshipFor(u.userId)}
                                online={onlineIds.has(u.userId)}
                                onChange={onChange}
                              />
                            </motion.li>
                          ))}
                        </motion.ul>
                      )}
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
