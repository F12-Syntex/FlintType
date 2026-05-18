"use client";

import { ArrowUpRight, X } from "lucide-react";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";
import { DISCORD_URL } from "@/lib/version";

/** Lightweight join-the-Discord prompt rendered at the top of every
 *  chrome'd page. Persists dismissal via the shared `banners` slice
 *  in user prefs (same row that drives the MonkeyType import nudge)
 *  so closing once stays closed across sessions and devices.
 *
 *  Server render: while the prefs slice hasn't loaded yet, returns
 *  null so the banner doesn't flash in then out for users who've
 *  already dismissed. The first render after hydration paints it
 *  iff the slice is loaded AND dismissed === false. */
const EMPTY_BANNER_STATE = {
  monkeytypeDismissed: false,
  discordDismissed: false,
};

export function DiscordBanner() {
  const { value, update } = useRemotePrefs<{
    monkeytypeDismissed: boolean;
    discordDismissed: boolean;
  }>("banners", EMPTY_BANNER_STATE);

  if (value.discordDismissed) return null;

  const dismiss = () => update({ discordDismissed: true });

  return (
    <div
      data-ft-banner="discord"
      className={cn(
        "relative flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2 text-foreground sm:px-6",
      )}
    >
      {/* Brand mark — solid Discord-blue dot reads as identity at
          a glance without taking real estate from the message. */}
      <span
        aria-hidden
        className="hidden size-2 shrink-0 rounded-full bg-ft-brand-discord sm:inline-block"
      />
      <p className="min-w-0 flex-1 truncate text-[12px] sm:text-[13px]">
        <span className="font-semibold">Join the flinttype Discord</span>
        <span className="hidden text-muted-foreground sm:inline">
          {" "}
          — daily races, palette drops, and direct line to the build.
        </span>
      </p>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5",
          "text-[10px] font-semibold uppercase tracking-[0.18em] text-white",
          "bg-ft-brand-discord transition-colors hover:bg-ft-brand-discord-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ft-brand-discord/40",
        )}
      >
        <span>Join</span>
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss Discord banner"
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          "transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
