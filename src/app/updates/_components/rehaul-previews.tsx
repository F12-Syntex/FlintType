import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mini-mockups for the 6.148 rehaul update card, split from
 *  previews.tsx to keep that file in size. Same rules: fixed `ft-*`
 *  light tokens only, aria-hidden decoration, the label carries the
 *  meaning. */

/** Rounded look — the new pill controls: a segmented switch with the
 *  orange selected pill over a filled primary button and an outline one. */
export function RoundedPreview() {
  return (
    <div aria-hidden className="flex w-full flex-col items-center gap-2">
      <div className="flex rounded-full bg-ft-ink/[0.06] p-0.5 ring-1 ring-inset ring-ft-line-soft">
        {["Words", "Time", "Quote"].map((label, i) => (
          <span
            key={label}
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold",
              i === 0 ? "bg-ft-ember text-white" : "text-ft-dim",
            )}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <span className="rounded-full bg-ft-ember px-2.5 py-1 text-[9px] font-bold text-white shadow-[0_4px_12px_-4px_var(--color-ft-ember)]">
          Find race
        </span>
        <span className="rounded-full bg-ft-paper px-2.5 py-1 text-[9px] font-semibold text-ft-ink ring-1 ring-inset ring-ft-line-soft">
          Lobby
        </span>
      </div>
    </div>
  );
}

/** Clearer results — speed first in orange, accuracy beside it, one
 *  obvious Next test button. */
export function ResultsPreview() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col gap-2 rounded-xl bg-ft-paper p-2.5 ring-1 ring-inset ring-ft-line-soft"
    >
      <div className="flex items-end gap-3 tabular-nums">
        <span className="flex flex-col">
          <span className="text-[8px] font-medium text-ft-dim">wpm</span>
          <span className="text-2xl font-bold leading-none tracking-[-0.04em] text-ft-ember">
            112
          </span>
        </span>
        <span className="flex flex-col">
          <span className="text-[8px] font-medium text-ft-dim">acc</span>
          <span className="text-base font-semibold leading-none text-ft-ink">98%</span>
        </span>
      </div>
      <span className="flex h-6 items-center justify-center gap-1 rounded-full bg-ft-ember text-[9px] font-bold text-white">
        <RotateCcw size={9} /> Next test
      </span>
    </div>
  );
}

/** Make it yours — the Style settings: button shape picks drawn in
 *  their own shape, Pill selected. */
export function StylePreview() {
  const shapes = [
    { label: "Pill", radius: "rounded-full", on: true },
    { label: "Round", radius: "rounded-md", on: false },
    { label: "Square", radius: "rounded-none", on: false },
  ];
  return (
    <div aria-hidden className="flex w-full flex-col gap-2">
      <div className="flex justify-between gap-1.5">
        {shapes.map((s) => (
          <span
            key={s.label}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 ring-1 ring-inset",
              s.on ? "bg-ft-ember/10 ring-ft-ember" : "bg-ft-paper ring-ft-line-soft",
            )}
          >
            <span className={cn("h-2.5 w-7", s.radius, s.on ? "bg-ft-ember" : "bg-ft-ink/25")} />
            <span className={cn("text-[8px] font-semibold", s.on ? "text-ft-ember" : "text-ft-dim")}>
              {s.label}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-full bg-ft-paper px-2 py-1 ring-1 ring-inset ring-ft-line-soft">
        <span className="text-[9px] font-medium text-ft-ink">Button glow</span>
        <span className="flex h-3 w-5 items-center justify-end rounded-full bg-ft-ember p-px">
          <span className="size-2.5 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}

/** Smarter practice — "Focus next": the weakest pairs as bars, the top
 *  one in orange, and the drill they open. */
export function SmarterPreview() {
  const pairs = [
    { key: "th", w: 92, hot: true },
    { key: "io", w: 64 },
    { key: "ck", w: 41 },
  ];
  return (
    <div aria-hidden className="flex w-full flex-col gap-1.5">
      {pairs.map((p) => (
        <div key={p.key} className="flex items-center gap-1.5">
          <span className="w-4 font-mono text-[9px] font-bold text-ft-ink">{p.key}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ft-ink/[0.07]">
            <span
              className={cn("block h-full rounded-full", p.hot ? "bg-ft-ember" : "bg-ft-ink/40")}
              style={{ width: `${p.w}%` }}
            />
          </span>
        </div>
      ))}
      <span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-ft-ink">
        <Check size={9} className="text-ft-ok" /> Drill picked for you
      </span>
    </div>
  );
}
