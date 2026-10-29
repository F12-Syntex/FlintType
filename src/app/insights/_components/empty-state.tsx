import Link from "next/link";
import { LearningSteps } from "@/components/analysis/learning-steps";
import { Surface } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import type { InsightsOverviewOutput } from "@/types/insights";
import { testKindOf } from "./copy-phrases";
import { EMPTY_BODY, EMPTY_TITLE, learningSteps, TAKE_A_TEST } from "./insights-copy";

/** No eligible test yet (spec-40 §4): one card that says what each test
 *  unlocks, and the way to start. Nothing else renders. */
export function EmptyState({ progress }: { progress: InsightsOverviewOutput["progress"] }) {
  return (
    <Surface className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{EMPTY_TITLE}</h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{EMPTY_BODY}</p>
      </div>
      <LearningSteps steps={learningSteps(progress, testKindOf(null))} />
      <Link href="/" className={buttonVariants({ size: "lg", className: "w-full self-start sm:w-auto" })}>
        {TAKE_A_TEST}
      </Link>
    </Surface>
  );
}
