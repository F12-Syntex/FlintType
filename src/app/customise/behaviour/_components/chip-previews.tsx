import { Volume2, VolumeX } from "lucide-react";
import { type Confidence } from "@/lib/behaviour-prefs";
import { cn } from "@/lib/utils";

/** Per-option chip samples (ui-law.md §12.2a) for the Behaviour page.
 *  Each is a tiny passage snippet rendered in the real typed / error /
 *  untyped colours so the user previews how the rule changes what they
 *  see while typing. Pure, SSR-safe, no chrome of their own. */

const ROW = "flex items-center gap-px font-mono text-[15px] leading-none";
const ERR = "text-[var(--ft-passage-error,var(--destructive))]";

/** A stuck-cursor block in the error colour — typing can't advance. */
function StuckCaret() {
  return (
    <span
      aria-hidden
      className="ml-px inline-block h-4 w-0.5 align-middle"
      style={{ backgroundColor: "var(--ft-passage-error, var(--destructive))" }}
    />
  );
}

/** Stop on error — ON halts at the wrong key (you must fix it); OFF
 *  records the wrong letter (red) and types on. */
export function StopOnErrorSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={ROW}>
      <span className="text-foreground">th</span>
      {on ? (
        <StuckCaret />
      ) : (
        <>
          <span className={ERR}>x</span>
          <span className="text-foreground">e</span>
        </>
      )}
    </span>
  );
}

/** Confidence — backspace freedom: full (off), stops at the word start
 *  (word), or disabled entirely (all). */
export function ConfidenceSample({ mode }: { mode: Confidence }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center gap-0.5 font-mono text-[17px] leading-none",
        mode === "off" ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className={cn(mode === "all" && "line-through")}>⌫</span>
      {mode === "word" ? (
        <span className="inline-block h-3.5 w-px bg-muted-foreground" />
      ) : null}
    </span>
  );
}

/** Allow extras — ON records keys typed past the word's end (red
 *  extras); OFF drops them (the word stays put). */
export function ExtrasSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={ROW}>
      <span className="text-foreground">word</span>
      {on ? (
        <span className={ERR}>xx</span>
      ) : (
        <span className="text-muted-foreground">·</span>
      )}
    </span>
  );
}

/** Strict space — ON refuses to advance on an incomplete word (stuck);
 *  OFF lets space jump to the next word mid-way. */
export function StrictSpaceSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={ROW}>
      <span className="text-foreground">wor</span>
      {on ? (
        <StuckCaret />
      ) : (
        <span className="text-muted-foreground">&nbsp;do</span>
      )}
    </span>
  );
}

/** Blind mode — OFF shows your typing; ON hides every glyph. */
export function BlindSample({ on }: { on: boolean }) {
  if (on)
    return (
      <span aria-hidden className={cn(ROW, "tracking-[0.15em] text-muted-foreground")}>
        •••
      </span>
    );
  return (
    <span aria-hidden className={ROW}>
      <span className="text-foreground">th</span>
      <span className="text-muted-foreground">e</span>
    </span>
  );
}

/** Minimum word length — a run of cells the length of the floor, so the
 *  user sees how long the shortest allowed word is. */
export function MinWordSample({ len }: { len: number }) {
  return (
    <span aria-hidden className="flex items-center gap-px">
      {Array.from({ length: len }, (_, i) => (
        <span
          key={i}
          className="block h-2.5 w-1.5 rounded-[1px]"
          style={{ backgroundColor: "color-mix(in oklch, var(--foreground) 32%, transparent)" }}
        />
      ))}
    </span>
  );
}

/** Show secondary — OFF is letters only; ON sprinkles numbers and
 *  punctuation (painted in the accent so they stand out). */
export function SecondarySample({ on }: { on: boolean }) {
  if (!on)
    return (
      <span aria-hidden className={cn(ROW, "text-foreground")}>
        word
      </span>
    );
  return (
    <span aria-hidden className={ROW}>
      <span className="text-foreground">wo</span>
      <span className="text-primary">3</span>
      <span className="text-foreground">d</span>
      <span className="text-primary">,</span>
    </span>
  );
}

/** Keypress click — a speaker (on) vs a muted speaker (off). */
export function KeypressClickSample({ on }: { on: boolean }) {
  return on ? (
    <Volume2 aria-hidden size={17} className="text-foreground" />
  ) : (
    <VolumeX aria-hidden size={17} className="text-muted-foreground" />
  );
}
