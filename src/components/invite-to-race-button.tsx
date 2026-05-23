"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { createLobbyAndInvite } from "@/lib/invite-to-lobby";
import { cn } from "@/lib/utils";

/** "Race a friend" action: opens a private lobby, notifies the friend
 *  in-app, and drops the host into the lobby to wait. Mutual-friends
 *  only — the caller decides whether to render it. */
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
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        const slug = await createLobbyAndInvite(backend, opponentId);
        if (slug) router.push(`/race/c/${slug}`);
        else setPending(false);
      }}
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60",
        className,
      )}
    >
      {pending ? "Opening…" : "Race"}
    </button>
  );
}
