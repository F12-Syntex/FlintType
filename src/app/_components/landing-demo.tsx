import { Stat } from "@/components/ft";

export function DemoPanel() {
  return (
    <section className="px-5 pb-20 sm:px-20 sm:pb-30">
      <div className="bg-ft-ink p-7 text-ft-paper sm:p-12 sm:px-14">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
              LIVE PREVIEW
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-ft-ember">
              ● RECORDING
            </span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-ft-warm-2">
            <span>WORDS · 50</span>
            <span>EN-COMMON</span>
            <span>ADAPT ON</span>
          </div>
        </div>

        <p className="m-0 text-lg leading-[1.6] sm:text-xl lg:text-[28px]">
          <span className="text-ft-paper">
            the difference between a good typist and a great one is
          </span>{" "}
          <span className="text-ft-paper">not</span>{" "}
          <span className="text-ft-ember underline decoration-1 underline-offset-[6px]">
            speed
          </span>{" "}
          <span className="text-ft-paper">but</span>{" "}
          <span className="relative">
            <span className="text-ft-paper">recov</span>
            <span
              className="mx-px inline-block h-[1em] w-0.5 align-text-bottom bg-ft-ember"
              style={{ animation: "ft-blink 1s steps(2) infinite" }}
              aria-hidden
            />
            <span className="text-ft-warm-4">
              ery the great ones do not avoid mistakes they simply spend less time
              on them than you do
            </span>
          </span>
        </p>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap gap-x-12 gap-y-3">
            <DarkStat label="WPM" value="92" big accent />
            <DarkStat label="ACC" value="97.2%" />
            <DarkStat label="PEAK" value="118" />
            <DarkStat label="ELAPSED" value="0:18" />
          </div>
          <div className="text-right text-[10px] uppercase tracking-[0.16em] text-ft-warm-3">
            ↓ STALLED ON &quot;th&quot; 4× · 2.1S LOST
            <br />
            <span className="text-ft-ember">→ DRILLING NEXT RUN</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DarkStat({
  label,
  value,
  big,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ft-warm-3">
        {label}
      </span>
      <span
        className={`font-bold tabular-nums tracking-[-0.03em] ${big ? "text-3xl sm:text-4xl lg:text-[44px]" : "text-2xl lg:text-[28px]"} ${accent ? "text-ft-ember" : "text-ft-paper"}`}
      >
        {value}
      </span>
    </div>
  );
}
