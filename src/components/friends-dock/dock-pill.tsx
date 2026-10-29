"use client";

import { Swords, Users } from "lucide-react";
import { Avatar } from "@/components/ft";
import { cn } from "@/lib/utils";

export type PillAvatar = {
  id: string;
  src: string | null;
  name: string;
  status: "live" | "online";
};

/** The dock's resting state at 2xl+ (below that the top bar's friends
 *  button opens it): a slim pill with up to three live / online avatars,
 *  a count and the pending race-invite badge. */
export function DockPill({
  open,
  onToggle,
  stack,
  label,
  labelClass,
  challenges,
}: {
  open: boolean;
  onToggle: () => void;
  stack: PillAvatar[];
  label: string;
  labelClass: string;
  challenges: number;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Friends"
      aria-haspopup="dialog"
      aria-expanded={open}
      className="group hidden h-10 items-center gap-2 rounded-pill border border-border bg-card/90 pl-1.5 pr-4 text-foreground shadow-float backdrop-blur-xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 2xl:flex"
    >
      {stack.length > 0 ? (
        <span className="flex -space-x-2">
          {stack.map((s) => (
            <Avatar
              key={s.id}
              src={s.src}
              alt={s.name}
              size="sm"
              status={s.status}
              dotRing="ring-card"
            />
          ))}
        </span>
      ) : (
        <span className="inline-flex size-7 items-center justify-center text-muted-foreground">
          <Users size={18} aria-hidden />
        </span>
      )}
      <span className={cn("text-[13px] font-medium tabular-nums", labelClass)}>
        {label}
      </span>
      {challenges > 0 ? (
        <span className="flex items-center gap-1 border-l border-border pl-2 text-[13px] font-medium tabular-nums text-muted-foreground">
          <Swords size={13} aria-hidden />
          {challenges}
        </span>
      ) : null}
    </button>
  );
}
