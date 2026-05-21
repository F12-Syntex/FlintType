"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { ActivityFeed } from "./feed";

/** Recent activity, collapsed by default so the hub stays calm. A single
 *  understated toggle line ("Recent activity · N new"); expanding reveals
 *  the feed in its own capped, scrollable area so a long history never
 *  pushes the page down. Hidden entirely when there's nothing to show. */
export function ActivitySection({
  items,
  loading,
}: {
  items: Notification[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const newCount = items.filter((n) => n.readAtMs == null).length;

  if (!loading && items.length === 0) return null;

  return (
    <section className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 self-start rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ChevronRight
          size={14}
          aria-hidden
          className={cn(
            "text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recent activity
        </span>
        {newCount > 0 ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            · {newCount} new
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="mt-2 max-h-80 overflow-y-auto pr-1">
          <ActivityFeed items={items} loading={loading} />
        </div>
      ) : null}
    </section>
  );
}
