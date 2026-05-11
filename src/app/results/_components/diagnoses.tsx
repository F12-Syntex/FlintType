import { cn } from "@/lib/utils";

const ITEMS = [
  {
    rank: 1,
    label: 'STALL · "th" transition',
    detail: '4 occurrences · 2.1s lost · slowest @ "the"',
    severity: "hi",
  },
  {
    rank: 2,
    label: "BURST CEILING · 118 WPM",
    detail: "plateau · ceiling held for 6 runs",
    severity: "mid",
  },
  {
    rank: 3,
    label: 'PAIR · "ou" latency',
    detail: "+82ms over baseline · 3 occurrences",
    severity: "mid",
  },
  {
    rank: 4,
    label: 'RESET · word "recovery"',
    detail: "backspaced 2× · likely habit",
    severity: "low",
  },
] as const;

export function Diagnoses() {
  return (
    <div className="flex flex-col">
      {ITEMS.map((it) => (
        <div
          key={it.rank}
          className="grid grid-cols-[28px_1fr_12px] items-start gap-3 border-b border-ft-line-soft py-3.5"
        >
          <span className="text-base font-semibold tabular-nums text-ft-dim">
            {String(it.rank).padStart(2, "0")}
          </span>
          <div>
            <div className="mb-1 text-[13px] font-semibold text-ft-ink">
              {it.label}
            </div>
            <div className="text-[11px] text-ft-dim-2">{it.detail}</div>
          </div>
          <span
            className={cn(
              "mt-1.5 size-1.5",
              it.severity === "hi"
                ? "bg-ft-ember"
                : it.severity === "mid"
                  ? "bg-ft-ember-soft"
                  : "bg-ft-dim",
            )}
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}
