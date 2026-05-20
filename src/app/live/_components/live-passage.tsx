"use client";

import { cn } from "@/lib/utils";
import type { LiveSnapshot } from "@/types/live";

/** Read-only mirror of a broadcaster's passage. We only know the
 *  cursor position (not which chars were mistyped — the snapshot
 *  doesn't carry per-char correctness), so chars before the cursor
 *  render typed, the cursor char is marked, and the rest are dim. A
 *  progress bar + live WPM/accuracy ride above it. */
export function LivePassage({ snapshot }: { snapshot: LiveSnapshot }) {
  const target = snapshot.words.join(" ");
  const cursor = Math.min(snapshot.progressChars, target.length);
  const frac =
    snapshot.totalChars > 0
      ? Math.min(1, snapshot.progressChars / snapshot.totalChars)
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="tabular-nums">
            <span className="text-foreground">{Math.round(snapshot.wpm)}</span>{" "}
            wpm ·{" "}
            <span className="text-foreground">
              {Math.round(snapshot.accuracy)}
            </span>
            % acc
          </span>
          <span>live</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
          <span
            aria-hidden
            className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${frac * 100}%` }}
          />
        </div>
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
