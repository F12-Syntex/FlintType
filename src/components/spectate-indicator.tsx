"use client";

import { useUser } from "@clerk/nextjs";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useBackend } from "@/lib/backend";
import { useWatcherCount } from "@/lib/live-watchers";
import { cn } from "@/lib/utils";
import type { LiveSpectator } from "@/types/live";

const NAME_POLL_MS = 2_500;

/** The on/off chip — presentational + pure, used by the Behaviour
 *  settings preview to show the sharing state at a forced value. */
export function SpectatePill({
  enabled,
  className,
}: {
  enabled: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
        enabled
          ? "border-primary/30 bg-primary/[0.06] text-foreground"
          : "border-border bg-card text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          enabled ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <Eye size={12} className="shrink-0" aria-hidden />
      {enabled ? "Friends can watch" : "Sharing off"}
    </span>
  );
}

/** "ada is spectating" / "ada, lin are spectating" / "3 people are
 *  spectating". Handles drop their leading `@` so it reads naturally. */
function watcherSentence(watchers: LiveSpectator[]): string {
  const names = watchers.map((w) => w.name.replace(/^@/, ""));
  if (names.length === 1) return `${names[0]} is spectating`;
  if (names.length === 2) return `${names[0]}, ${names[1]} are spectating`;
  return `${watchers.length} people are spectating`;
}

function countSentence(n: number): string {
  return n === 1 ? "1 person is spectating" : `${n} people are spectating`;
}

/** Live "who's watching" readout on practice surfaces. It renders only
 *  while someone's actually watching — driven by the shared watcher
 *  count the broadcaster learns from its own `live.progress` responses
 *  (no idle polling). When a watcher is present it fetches their handles
 *  to name them; until those resolve, the count carries the message. */
export function SpectateIndicator({ className }: { className?: string }) {
  const { isSignedIn } = useUser();
  const backend = useBackend();
  const count = useWatcherCount();
  const [watchers, setWatchers] = useState<LiveSpectator[]>([]);
  const active = !!isSignedIn && count > 0;

  useEffect(() => {
    if (!active) {
      setWatchers([]);
      return;
    }
    let cancelled = false;
    const poll = () => {
      backend.live
        .spectators()
        .then((r) => {
          if (!cancelled) setWatchers(r.watchers);
        })
        .catch(() => {});
    };
    poll();
    const id = window.setInterval(poll, NAME_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, backend]);

  if (!active) return null;
  return (
    <div className={cn("flex justify-end", className)} aria-live="polite">
      <span className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">
        <span
          aria-hidden
          className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <Eye size={14} className="shrink-0 text-primary" aria-hidden />
        {watchers.length > 0 ? watcherSentence(watchers) : countSentence(count)}
      </span>
    </div>
  );
}
