"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRemotePrefs } from "@/lib/use-remote-prefs";

const EMPTY_BANNER_STATE = { monkeytypeDismissed: false };

/** A calm prompt under the hero nudging the owner to import their
 *  MonkeyType history. Renders only when:
 *    - viewer owns this profile (`isOwner`)
 *    - the owner hasn't already connected (`isConnected` is false)
 *    - the owner hasn't dismissed it before (stored in user-prefs
 *      under `banners.monkeytypeDismissed`)
 *
 *  Neutral card + an outline button: it's an optional extra, so it
 *  never competes with the page's orange. Dismiss persists across
 *  sessions via `useRemotePrefs`. The dialog opens via `onConnect` so
 *  the parent owns the import dialog's mount. */
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
      aria-label="MonkeyType import prompt"
      data-ft-banner="monkeytype"
      className="flex items-start gap-3 rounded-2xl border border-border bg-card py-3 pr-2 pl-5 sm:items-center sm:gap-4 sm:pl-6"
    >
      <span
        aria-hidden
        className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground sm:flex"
      >
        <Download size={16} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">
            Coming from MonkeyType?
          </span>
          <p className="text-sm leading-snug text-foreground">
            Bring your history over: personal bests, lifetime stats, the lot.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          className="h-11 self-start sm:h-8 sm:self-center"
        >
          Import
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        aria-label="Dismiss this prompt"
        className="size-11 shrink-0 text-muted-foreground sm:size-9"
      >
        <X aria-hidden />
      </Button>
    </section>
  );
}
