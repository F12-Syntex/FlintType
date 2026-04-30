import { Panel } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { BigStats } from "./_components/big-stats";
import { BurstHist } from "./_components/burst-hist";
import { Diagnoses } from "./_components/diagnoses";
import { ErrorsList } from "./_components/errors-list";
import { ResultsHeader } from "./_components/header";
import { HistoryStrip } from "./_components/history-strip";
import { KeyboardHeatmap } from "./_components/keyboard-heatmap";
import { NextSession } from "./_components/next-session";
import { Pairs } from "./_components/pairs";
import { WpmTrace } from "./_components/wpm-trace";

export const metadata = buildPageMetadata({
  title: "Run report",
  description: "flinttype run report — diagnosis, ranked stalls, and an adaptive drill plan.",
  path: "/app/results",
  noIndex: true,
});

export default function ResultsPage() {
  return (
    <AppChrome>
      <ResultsHeader />
      <BigStats />

      <section className="grid grid-cols-1 gap-7 px-5 py-9 sm:px-14 lg:grid-cols-[2fr_1fr]">
        <Panel
          title="WPM TRACE · WORDS-PER-SECOND OVER RUN"
          subtitle="118 peak · 60 stall · σ 12.4"
        >
          <WpmTrace />
        </Panel>
        <Panel title="DIAGNOSIS" subtitle="ranked by time lost">
          <Diagnoses />
        </Panel>
        <Panel
          title="KEY LATENCY MAP"
          subtitle="ms over baseline · darker = slower"
        >
          <KeyboardHeatmap />
        </Panel>
        <div className="flex flex-col gap-7">
          <Panel
            title="LETTER-PAIR STALLS"
            subtitle="top 8 worst transitions"
          >
            <Pairs />
          </Panel>
          <Panel
            title="BURST CEILING"
            subtitle="histogram of WPM bursts (1-sec windows)"
          >
            <BurstHist />
          </Panel>
        </div>
        <Panel
          title="WORD ERRORS · 3 OF 50"
          subtitle="words you reset on or mis-typed"
        >
          <ErrorsList />
        </Panel>
        <Panel title="NEXT SESSION" subtitle="adaptive drill plan">
          <NextSession />
        </Panel>
      </section>

      <section className="px-5 pb-14 sm:px-14">
        <Panel
          title="LAST 30 RUNS · WPM"
          subtitle="sparkline · today highlighted"
        >
          <HistoryStrip />
        </Panel>
      </section>
    </AppChrome>
  );
}
