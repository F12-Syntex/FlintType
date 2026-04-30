import { cn } from "@/lib/utils";

const RECORDS = [
  { mode: "WORDS · 25", wpm: 124, date: "12 days ago" },
  { mode: "WORDS · 50", wpm: 118, date: "today" },
  { mode: "WORDS · 100", wpm: 102, date: "4 days ago" },
  { mode: "TIME · 60s", wpm: 109, date: "3 weeks ago" },
  { mode: "QUOTE", wpm: 96, date: "2 weeks ago" },
  { mode: "CODE · JS", wpm: 78, date: "5 days ago" },
];

export function Records() {
  return (
    <div className="flex flex-col">
      {RECORDS.map((r) => (
        <div
          key={r.mode}
          className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3.5 border-b border-ft-line-soft py-3"
        >
          <span className="text-xs font-medium tracking-wide">{r.mode}</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums tracking-[-0.02em]",
              r.date === "today" ? "text-ft-ember" : "text-ft-ink",
            )}
          >
            {r.wpm}
          </span>
          <span className="min-w-22 text-right text-[10px] tracking-[0.1em] text-ft-dim uppercase">
            {r.date}
          </span>
        </div>
      ))}
    </div>
  );
}
