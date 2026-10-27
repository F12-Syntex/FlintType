"use client";

import { ArrowUpRight, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
      className="mx-4 mt-3 flex items-center gap-3 rounded-pill border border-border bg-card/70 py-1.5 pr-1.5 pl-4 text-foreground shadow-card sm:mx-6"
    >
      {/* Brand mark — the one place Discord blue appears. */}
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-ft-brand-discord"
      />
      <p className="min-w-0 flex-1 truncate text-[13px]">
        <span className="font-medium">Join the flinttype Discord</span>
        <span className="hidden text-muted-foreground sm:inline">
          {" "}
          for daily races, palette drops and a direct line to the build.
        </span>
      </p>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Join
        <ArrowUpRight className="size-3.5" aria-hidden />
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss Discord banner"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
