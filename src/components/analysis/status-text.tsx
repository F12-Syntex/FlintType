import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTextProps = {
  tone: "ok" | "learning" | "live";
  children: ReactNode;
  className?: string;
};

const DOT: Record<StatusTextProps["tone"], string> = {
  ok: "bg-ft-ok",
  learning: "bg-muted-foreground/50",
  live: "bg-primary motion-safe:animate-pulse",
};

/** A state in one or two words beside a small dot: no border, no fill.
 *  It replaces status pills ("Warm", "Race in progress"); the words carry
 *  the state, so the dot's colour is never the only cue. `live` marks a
 *  live race state with a pulsing orange dot (motion-safe), like the
 *  race screen's joining line (ui-law §13.1, §17.4, §23). */
export function StatusText({ tone, children, className }: StatusTextProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-foreground", className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      <span>{children}</span>
    </span>
  );
}
