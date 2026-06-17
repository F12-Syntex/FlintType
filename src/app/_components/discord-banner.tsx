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
 *  Flash + hydration guard: `loaded` from useRemotePrefs is false on
 *  the server and on the first client render (it flips inside an
 *  effect), so the banner renders null in both — SSR markup and
 *  hydration agree, and a user who dismissed it never sees it flash
 *  in then out while the prefs blob loads. It paints only once the
 *  blob is available AND dismissed === false; for non-dismissed
 *  users that means it appears just after hydration, which is the
 *  acceptable trade. */
const EMPTY_BANNER_STATE = {
  monkeytypeDismissed: false,
  discordDismissed: false,
};

export function DiscordBanner() {
  const { value, loaded, update } = useRemotePrefs<{
    monkeytypeDismissed: boolean;
    discordDismissed: boolean;
  }>("banners", EMPTY_BANNER_STATE);

  if (!loaded || value.discordDismissed) return null;

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
