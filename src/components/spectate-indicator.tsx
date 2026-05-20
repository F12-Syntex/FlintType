"use client";

import { useUser } from "@clerk/nextjs";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";
import type { LiveSpectator } from "@/types/live";

/** Module-level stable default — useRemotePrefs captures it once.
 *  Sharing is ON by default; only an explicit `false` turns it off. */
const SPECTATE_DEFAULT: { enabled?: boolean; blocked?: string[] } = {
  enabled: true,
};
const POLL_MS = 2_000;

function isSharing(enabled: boolean | undefined): boolean {
  return enabled !== false;
}

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

/** Phrasing the watcher list the way the user reads it: "ada is
 *  spectating" / "ada, lin are spectating" / "3 people are spectating".
 *  Handles drop their leading `@` so the sentence reads naturally. */
function watcherSentence(watchers: LiveSpectator[]): string {
  const names = watchers.map((w) => w.name.replace(/^@/, ""));
  if (names.length === 1) return `${names[0]} is spectating`;
  if (names.length === 2) return `${names[0]}, ${names[1]} are spectating`;
  return `${watchers.length} people are spectating`;
}

/** Live "who's watching" readout on practice surfaces. While sharing is
 *  on and signed in, it polls `live.spectators`; it renders ONLY when at
 *  least one person is currently watching (so an idle run shows nothing
 *  and never reflows the typing area). The coral dot is the live spark. */
export function SpectateIndicator({ className }: { className?: string }) {
  const { isSignedIn } = useUser();
  const backend = useBackend();
  const { value } = useRemotePrefs<{ enabled?: boolean; blocked?: string[] }>(
    "spectate",
    SPECTATE_DEFAULT,
  );
  const sharing = !!isSignedIn && isSharing(value.enabled);
  const [watchers, setWatchers] = useState<LiveSpectator[]>([]);

  useEffect(() => {
    if (!sharing) {
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
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sharing, backend]);

  if (!sharing || watchers.length === 0) return null;
  return (
    <div className={cn("flex justify-end", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/[0.06] px-2 py-1 text-[11px] font-medium text-foreground">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
        />
        <Eye size={12} className="shrink-0" aria-hidden />
        {watcherSentence(watchers)}
      </span>
    </div>
  );
}
