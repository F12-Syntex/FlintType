"use client";

import { Download, X } from "lucide-react";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";

const EMPTY_BANNER_STATE = { monkeytypeDismissed: false };

/** Top-of-profile prompt nudging the owner to import their existing
 *  MonkeyType history. Renders only when:
 *    - viewer owns this profile (`isOwner`)
 *    - the owner hasn't already connected (`isConnected` is false)
 *    - the owner hasn't dismissed it before (stored in user-prefs
 *      under `banners.monkeytypeDismissed`)
 *
 *  Dismiss persists across sessions via `useRemotePrefs` — the moment
 *  the user clicks ×, the next render returns null and stays null
 *  on every future visit. The dialog itself opens via the supplied
 *  `onConnect` callback so the parent owns the import dialog's mount. */
export function MonkeytypeBanner({
  isOwner,
  isConnected,
  onConnect,
}: {
  isOwner: boolean;
  isConnected: boolean;
  onConnect: () => void;
}) {
  const { value, update } = useRemotePrefs<{ monkeytypeDismissed: boolean }>(
    "banners",
    EMPTY_BANNER_STATE,
  );

  if (!isOwner) return null;
  if (isConnected) return null;
  if (value.monkeytypeDismissed) return null;

  const dismiss = () => update({ monkeytypeDismissed: true });

  return (
    <section
      role="region"
      aria-label="MonkeyType import prompt"
      className={cn(
        "flex items-center gap-3 rounded-md border border-primary/40 bg-primary/[0.06] px-4 py-3 sm:px-5",
      )}
    >
      <span
        aria-hidden
        className="hidden size-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/[0.08] text-primary sm:flex"
      >
        <Download size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Already a typist?
        </span>
        <p className="text-[12px] leading-snug text-foreground sm:text-[13px]">
          Bring your MonkeyType history over — PBs, lifetime stats, the lot.
        </p>
      </div>
      <button
        type="button"
        onClick={onConnect}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3",
          "text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
          "transition-colors hover:bg-primary/90 active:translate-y-[1px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        <span className="hidden sm:inline">Connect</span>
        <span className="sm:hidden">Link</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss this prompt"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          "transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        <X size={14} aria-hidden />
      </button>
    </section>
  );
}
