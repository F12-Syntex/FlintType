import { Tag } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { DailyChart } from "./_components/daily-chart";
import { Headline } from "./_components/headline";
import { PairEvolution } from "./_components/pair-evolution";
import { Records } from "./_components/records";
import { RunLog } from "./_components/runlog";

export const metadata = buildPageMetadata({
  title: "History",
  description: "flinttype 90-day history — plain-English insights up top, technical decomposition below.",
  path: "/app/history",
  noIndex: true,
});

const RANGES = ["7D", "30D", "90D", "1Y", "ALL"];

export default function HistoryPage() {
  return (
    <AppChrome>
      <Headline />

      <section className="border-b border-ft-line-soft px-5 py-8 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-5">
            <Tag>DAILY WPM · 90 DAYS</Tag>
            <span className="text-[11px] text-ft-dim-2">
              each bar = best run that day · line = 7-day average
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {RANGES.map((p) => (
              <span
                key={p}
                className={`border border-ft-line-soft px-2.5 py-1 text-[10px] tracking-[0.14em] ${
                  p === "90D"
                    ? "bg-ft-ink text-ft-paper"
                    : "bg-transparent text-ft-dim-2"
                }`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <DailyChart />
      </section>

      <section className="grid grid-cols-1 gap-8 border-b border-ft-line-soft px-5 py-8 sm:px-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Tag>YOUR WEAKNESSES · OVER TIME</Tag>
            <span className="text-[11px] text-ft-dim-2">
              top 6 letter pairs · ms over baseline · weekly
            </span>
          </div>
          <PairEvolution />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Tag>PERSONAL BESTS</Tag>
            <span className="text-[11px] text-ft-dim-2">by mode</span>
          </div>
          <Records />
        </div>
      </section>

      <section className="px-5 py-8 pb-14 sm:px-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <Tag>RUN LOG · LAST 12 OF 1,042</Tag>
          <div className="flex gap-3 text-[11px] text-ft-dim-2">
            <span>FILTER ▾</span>
            <span>SORT: NEWEST ▾</span>
            <span>EXPORT CSV</span>
          </div>
        </div>
        <RunLog />
      </section>
    </AppChrome>
  );
}
