import { cn } from "@/lib/utils";

type Racer = {
  name: string;
  wpm: number;
  prog: number;
  you?: boolean;
  ghost?: boolean;
  badge?: string;
  flag: string;
  acc: number;
};

const RACERS: Racer[] = [
  { name: "@damiel", wpm: 218, prog: 0.92, badge: "GRANDMASTER", flag: "🇸🇪", acc: 98.2 },
  { name: "@selan", wpm: 138, prog: 0.62, badge: "EXPERT", flag: "🇨🇦", acc: 97.1 },
  { name: "@you", wpm: 92, prog: 0.41, you: true, badge: "ADEPT", flag: "🇬🇧", acc: 97.2 },
  { name: "@your-ghost · best run", wpm: 104, prog: 0.48, ghost: true, flag: "◐", acc: 96.8 },
  { name: "@kassia", wpm: 86, prog: 0.38, badge: "ADEPT", flag: "🇩🇪", acc: 95.4 },
];

function Lane({ racer, pos }: { racer: Racer; pos: number }) {
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 sm:grid-cols-[36px_240px_1fr_90px] sm:gap-3.5">
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          pos === 1 ? "text-ft-ember" : "text-[#6E695F]",
        )}
      >
        {String(pos).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] text-[#9C978A]">{racer.flag}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-[13px] font-semibold",
              racer.you
                ? "text-ft-ember"
                : racer.ghost
                  ? "text-[#6E695F] italic"
                  : "text-ft-paper",
            )}
          >
            {racer.name}
          </span>
          {racer.badge ? (
            <span className="text-[8px] tracking-[0.16em] text-[#6E695F]">
              {racer.badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="relative col-span-2 h-5 border border-[#221F1A] bg-[#1A1815] sm:col-span-1">
        <div
          className={cn(
            "absolute top-0 bottom-0 left-0",
            racer.you
              ? "bg-ft-ember"
              : racer.ghost
                ? "bg-[repeating-linear-gradient(45deg,#3A3530_0_4px,#2A2620_4px_8px)]"
                : "bg-[#9C978A]",
          )}
          style={{ width: `${racer.prog * 100}%` }}
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-[#221F1A]"
            style={{ left: `${t * 100}%` }}
            aria-hidden
          />
        ))}
        <div className="absolute top-0 right-0 bottom-0 w-1 bg-ft-ember" aria-hidden />
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            racer.you ? "text-ft-ember" : "text-ft-paper",
          )}
        >
          {racer.wpm}
        </span>
        <span className="text-[9px] tracking-wide text-[#6E695F] tabular-nums">
          {racer.acc}% acc
        </span>
      </div>
    </div>
  );
}

export function RaceLanes() {
  return (
    <div className="flex flex-col gap-3">
      {RACERS.map((r, i) => (
        <Lane key={r.name} racer={r} pos={i + 1} />
      ))}
    </div>
  );
}
