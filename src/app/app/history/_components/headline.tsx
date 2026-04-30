import { Tag } from "@/components/ft";

type InsightKind = "win" | "now" | "next";

const INSIGHTS: { kind: InsightKind; headline: string; detail: string }[] = [
  {
    kind: "win",
    headline: "Your 'th' stall is fixed",
    detail:
      "From 142ms over baseline → 18ms. Showed up in every report 6 weeks ago. Hasn't appeared in your last 12 runs.",
  },
  {
    kind: "now",
    headline: "Your new ceiling is 118 WPM",
    detail:
      "You've held this for 3 weeks. Bursts above 120 happen, but inconsistently — 2 of 30 runs.",
  },
  {
    kind: "next",
    headline: "'ou' is your next bottleneck",
    detail:
      "Now your slowest pair (+82ms). Drilling it would likely add 3–5 WPM to your average.",
  },
];

const KIND_DOT: Record<InsightKind, string> = {
  win: "border-ft-ok text-ft-ok",
  now: "border-ft-dim text-ft-dim",
  next: "border-ft-ember text-ft-ember",
};

const KIND_LABEL: Record<InsightKind, string> = {
  win: "WIN",
  now: "CURRENT",
  next: "NEXT",
};

function Insight({
  kind,
  headline,
  detail,
}: {
  kind: InsightKind;
  headline: string;
  detail: string;
}) {
  return (
    <div className={`flex-1 border-l-2 pl-4.5 ${KIND_DOT[kind]}`}>
      <div className="mb-2 text-[10px] font-semibold tracking-[0.18em]">
        {KIND_LABEL[kind]}
      </div>
      <div className="mb-1.5 text-base leading-snug font-semibold text-ft-ink sm:text-[17px]">
        {headline}
      </div>
      <div className="text-xs leading-relaxed text-ft-dim-2">{detail}</div>
    </div>
  );
}

export function Headline() {
  return (
    <section className="border-b border-ft-line-soft px-5 pt-12 pb-9 sm:px-16">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
        <Tag>YOUR HISTORY · LAST 90 DAYS</Tag>
      </div>
      <h1 className="m-0 max-w-5xl text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-[56px]">
        You&apos;re <span className="text-ft-ember">14 wpm faster</span> than 90
        days ago.
        <br />
        <span className="text-ft-dim">
          Most of the gain came from killing your &quot;th&quot; stall.
        </span>
      </h1>
      <div className="mt-9 flex flex-col gap-7 sm:flex-row sm:gap-14">
        {INSIGHTS.map((i) => (
          <Insight key={i.kind} {...i} />
        ))}
      </div>
    </section>
  );
}
