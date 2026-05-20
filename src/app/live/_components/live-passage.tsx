"use client";

import { Stat } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { LiveSnapshot } from "@/types/live";

/** Read-only mirror of a broadcaster's passage. We only know the cursor
 *  position (not which chars were mistyped — the snapshot doesn't carry
 *  per-char correctness), so chars before the cursor render typed, the
 *  cursor char is marked, the rest are dim. Live WPM/accuracy ride above
 *  as editorial stats, with a coral progress bar. */
export function LivePassage({ snapshot }: { snapshot: LiveSnapshot }) {
  const target = snapshot.words.join(" ");
  const cursor = Math.min(snapshot.progressChars, target.length);
  const frac =
    snapshot.totalChars > 0
      ? Math.min(1, Math.max(0, snapshot.progressChars / snapshot.totalChars))
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-end gap-8">
          <Stat label="wpm" value={Math.round(snapshot.wpm)} size="lg" />
          <Stat
            label="acc"
            value={Math.round(snapshot.accuracy)}
            suffix="%"
            size="lg"
          />
        </div>
        <span className="flex items-center gap-1.5 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
          />
          live
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
        role="progressbar"
        aria-label="Live progress"
        aria-valuenow={Math.round(frac * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          aria-hidden
          className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${frac * 100}%` }}
        />
      </div>

      <p className="font-mono text-xl leading-[1.8] tracking-tight sm:text-2xl">
        {target.split("").map((ch, i) => {
          const state =
            i < cursor ? "typed" : i === cursor ? "cursor" : "untyped";
          return (
            <span
              key={i}
              className={cn(
                state === "typed" && "text-foreground",
                state === "cursor" &&
                  "rounded-[2px] bg-primary/15 text-foreground underline decoration-primary decoration-2 underline-offset-4",
                state === "untyped" && "text-muted-foreground/60",
                ch === " " && "px-px",
              )}
            >
              {ch}
            </span>
          );
        })}
      </p>
    </div>
  );
}
