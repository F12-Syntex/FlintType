import { Tag } from "@/components/ft";

export function LoopGrid() {
  return (
    <section className="px-5 pb-20 sm:px-20 sm:pb-30">
      <div className="mb-10 flex flex-wrap items-baseline gap-4 sm:mb-14">
        <Tag>§ 02</Tag>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[44px]">
          The loop.
        </h2>
        <span className="ml-auto text-xs text-ft-dim">
          type · diagnose · drill · repeat
        </span>
      </div>
      <div className="grid grid-cols-1 border-t border-ft-ink md:grid-cols-3">
        <Step
          n="01"
          title="Type"
          body="Fast, clean, distraction-free. Pick words, time, quote, or code. Live WPM and accuracy in the periphery — never in your face."
        />
        <Step
          n="02"
          title="Diagnose"
          body="Every keystroke gets analysed. Letter-pair latencies, word-level stalls, burst ceilings, error topology. You get a report, not a number."
          accent
        />
        <Step
          n="03"
          title="Drill"
          body="Adaptive practice generates passages that target your specific weaknesses. Your 'ou' problem, your 90 WPM ceiling, your 'th' reset habit — drilled directly."
        />
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
  accent,
}: {
  n: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative border-b border-ft-line-soft px-7 py-8 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 ${accent ? "bg-ft-ember/[0.04]" : ""}`}
    >
      <div className="mb-6 flex justify-between">
        <span
          className={`text-[11px] uppercase tracking-[0.18em] tabular-nums ${accent ? "text-ft-ember" : "text-ft-dim"}`}
        >
          STEP {n}
        </span>
        {accent && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-ft-ember">
            ★ THE DIFFERENCE
          </span>
        )}
      </div>
      <h3 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}.
      </h3>
      <p className="text-[13px] leading-relaxed text-ft-dim-2">{body}</p>
    </div>
  );
}
