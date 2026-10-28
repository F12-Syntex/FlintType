import { type Confidence } from "@/lib/behaviour-prefs";
import { cn } from "@/lib/utils";

/** Per-option chip samples (ui-law.md §12.2a) for the Behaviour page.
 *  Pure, SSR-safe, no chrome of their own. (On/off behaviour rows are
 *  switches, so only the multi-option rows keep a sample.) */

/** Confidence — backspace freedom: full (off), stops at the word start
 *  (word), or disabled entirely (all). */
export function ConfidenceSample({ mode }: { mode: Confidence }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center gap-0.5 font-mono text-[13px] leading-none",
        mode === "off" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className={cn(mode === "all" && "line-through")}>⌫</span>
      {mode === "word" ? (
        <span className="inline-block h-2.5 w-px bg-muted-foreground" />
      ) : null}
    </span>
  );
}
