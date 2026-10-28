"use client";

import { Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBackend } from "@/lib/backend";
import { createLobbyAndInvite } from "@/lib/invite-to-lobby";
import { cn } from "@/lib/utils";

/** "Race a friend" action: opens a private lobby, notifies the friend
 *  in-app, and drops the host into the lobby to wait. Mutual-friends
 *  only — the caller decides whether to render it. An outline pill so
 *  the orange Follow / primary action stays the one filled button. */
export function InviteToRaceButton({
  opponentId,
  className,
}: {
  opponentId: string;
  className?: string;
}) {
  const backend = useBackend();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        const slug = await createLobbyAndInvite(backend, opponentId);
        if (slug) router.push(`/race/c/${slug}`);
        else setPending(false);
      }}
      className={cn("h-11 sm:h-9", className)}
    >
      <Swords aria-hidden data-icon="inline-start" />
      {pending ? "Opening…" : "Race"}
    </Button>
  );
}
