import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

const RUNS = [
  { time: "14:22 today", mode: "WORDS·50", wpm: 92, acc: 97.2, peak: 118, stalls: 3, note: "broke 95 in 2 bursts" },
  { time: "14:18 today", mode: "WORDS·50", wpm: 88, acc: 96.4, peak: 110, stalls: 4, note: "th-drill aftermath" },
  { time: "14:11 today", mode: "TH-DRILL·50", wpm: 84, acc: 98.1, peak: 102, stalls: 1, note: "adaptive · th-focused" },
  { time: "09:32 today", mode: "WORDS·100", wpm: 86, acc: 95.8, peak: 108, stalls: 6, note: "" },
  { time: "yesterday 21:14", mode: "TIME·60s", wpm: 90, acc: 96.1, peak: 112, stalls: 4, note: "" },
  { time: "yesterday 19:02", mode: "CODE·JS", wpm: 71, acc: 94.8, peak: 92, stalls: 8, note: "symbols slow" },
  { time: "yesterday 18:55", mode: "WORDS·25", wpm: 96, acc: 98.4, peak: 116, stalls: 1, note: "" },
  { time: "2 days ago", mode: "WORDS·50", wpm: 87, acc: 96.8, peak: 109, stalls: 3, note: "" },
  { time: "2 days ago", mode: "OU-DRILL·50", wpm: 80, acc: 97.6, peak: 98, stalls: 2, note: "adaptive · ou-focused" },
  { time: "3 days ago", mode: "QUOTE", wpm: 89, acc: 97.0, peak: 105, stalls: 4, note: "" },
  { time: "4 days ago", mode: "WORDS·100", wpm: 102, acc: 96.4, peak: 124, stalls: 5, note: "PB · 100w" },
  { time: "5 days ago", mode: "CODE·JS", wpm: 78, acc: 95.2, peak: 96, stalls: 7, note: "PB · code" },
];

const COLS =
  "grid-cols-[160px_130px_80px_80px_70px_70px_1fr_60px]";

export function RunLog() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[820px]">
        <div className={`grid ${COLS} gap-3 border-t border-ft-ink border-b border-b-ft-line-soft py-2.5`}>
          {["TIME", "MODE", "WPM", "ACC", "PEAK", "STALLS", "NOTE", ""].map(
            (h) => (
              <Tag key={h}>{h}</Tag>
            ),
          )}
        </div>
        {RUNS.map((r, i) => (
          <div
            key={i}
            className={`grid ${COLS} items-baseline gap-3 border-b border-ft-line-soft py-3 text-xs`}
          >
            <span className="text-ft-dim-2">{r.time}</span>
            <span className="tracking-wide">{r.mode}</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                r.wpm >= 100 ? "text-ft-ember" : "text-ft-ink",
              )}
            >
              {r.wpm}
            </span>
            <span className="tabular-nums text-ft-dim-2">{r.acc}%</span>
            <span className="tabular-nums text-ft-dim-2">{r.peak}</span>
            <span
              className={cn(
                "tabular-nums",
                r.stalls >= 6 ? "text-ft-ember" : "text-ft-dim-2",
              )}
            >
              {r.stalls}
            </span>
            <span
              className={cn(
                "text-[11px]",
                r.note.includes("PB") ? "text-ft-ember" : "text-ft-dim-2",
              )}
            >
              {r.note}
              {r.note.includes("PB") ? " ★" : ""}
            </span>
            <span className="text-right text-[10px] tracking-[0.16em] text-ft-dim">
              OPEN →
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
