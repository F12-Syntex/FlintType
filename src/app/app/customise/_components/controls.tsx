import { cn } from "@/lib/utils";

/** A two-state toggle. Visual-only here — no onChange wired yet, settings
 *  state will land when the persistence layer ships. */
export function Toggle({ on }: { on: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className={cn(
        "inline-flex h-4 w-8 items-center border p-px transition-colors",
        on ? "border-ft-ember bg-ft-ember" : "border-ft-dim bg-transparent",
      )}
    >
      <span
        className={cn(
          "size-3 transition-transform",
          on ? "translate-x-4 bg-white" : "translate-x-0 bg-ft-dim",
        )}
      />
    </span>
  );
}

/** Pill-row select — each option is its own clickable pill. Active pill
 *  is the brand-fixed dim/ember pair so it survives any palette swap. */
export function Select({
  value,
  options,
}: {
  value: string;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {options.map((o) => (
        <span
          key={o}
          className={cn(
            "border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors",
            o === value
              ? "border-ft-ink bg-ft-ink text-ft-paper"
              : "border-ft-line-soft bg-transparent text-ft-dim-2",
          )}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex w-40 items-center gap-3">
      <div className="relative h-1 flex-1 bg-ft-line-soft">
        <div
          className="absolute top-0 bottom-0 left-0 bg-ft-ember"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-1 size-3 bg-ft-ember"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <span className="min-w-4 text-right text-[11px] tabular-nums text-ft-ink">
        {value}
      </span>
    </div>
  );
}
