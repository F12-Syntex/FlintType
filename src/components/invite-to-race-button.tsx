"use client";

import { Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useBackend } from "@/lib/backend";
import { createLobbyAndInvite } from "@/lib/invite-to-lobby";
import { useAsyncAction } from "@/lib/use-async-action";
import { cn } from "@/lib/utils";

/** "Race a friend" action: opens a private lobby, notifies the friend
 *  in-app, and drops the host into the lobby to wait. Mutual-friends
 *  only — the caller decides whether to render it. An outline pill so
 *  the orange Follow / primary action stays the one filled button.
 *
 *  Three visible states (§6.3): "Opening…" while the lobby is made (and
 *  until the route change lands), the lobby itself on success, and a
 *  short error line under the button when it fails. `className` styles
 *  the wrapper (e.g. `hidden sm:inline-flex`). */
export function InviteToRaceButton({
  opponentId,
  className,
}: {
  opponentId: string;
  className?: string;
}) {
  const backend = useBackend();
  const router = useRouter();
  const action = useAsyncAction<string>(async () => {
    const slug = await createLobbyAndInvite(backend, opponentId);
    if (!slug) throw new Error("Couldn't open a lobby");
    router.push(`/race/c/${slug}`);
    return slug;
  });
  // Stay "Opening…" after success: the route change is still landing.
  const pending = action.loading || action.result?.ok === true;
  const failed = action.result != null && !action.result.ok;

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!pending) void action.run();
        }}
        className="h-11 sm:h-9"
      >
        <Swords aria-hidden data-icon="inline-start" />
        {pending ? "Opening…" : "Race"}
      </Button>
      {failed ? (
        <span role="alert" className="max-w-48 text-right text-xs text-destructive">
          Couldn&apos;t open a lobby. Try again.
        </span>
      ) : null}
    </div>
  );
}
