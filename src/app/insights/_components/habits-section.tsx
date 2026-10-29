import { LearningSteps } from "@/components/analysis/learning-steps";
import { QuestionRow } from "@/components/analysis/question-row";
import { PageSection, Surface } from "@/components/page-shell";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import type { HabitsSection as HabitsData, InsightsBucket } from "@/types/insights";
import {
  HABIT_METHOD,
  HABIT_QUESTION,
  habitAnswer,
  habitEvidence,
  habitGate,
  PENDING_TITLE,
  testsTooShortForPace,
} from "./habit-copy";
import { testKindOf } from "./copy-phrases";
import { HABITS_DESCRIPTION, HABITS_TITLE } from "./insights-copy";

/** "Your habits" (spec-40 §3.6): plain questions answered from your own
 *  tests. Only habits with enough data answer; the rest wait in a list
 *  that counts up. Two columns from lg. */
export function HabitsSection({
  habits,
  unit,
  bucket,
  usualWpm,
}: {
  habits: HabitsData;
  unit: TypingSpeedUnit;
  bucket: InsightsBucket | null;
  usualWpm: number | null;
}) {
  const { items, pending } = habits;
  if (items.length === 0 && pending.length === 0) return null;
  const tooShort = testsTooShortForPace(bucket, usualWpm) ? testKindOf(bucket) : null;
  return (
    <PageSection id="habits" title={HABITS_TITLE} description={HABITS_DESCRIPTION}>
      <Surface className="overflow-hidden">
        {items.length > 0 ? (
          <ul className="divide-y divide-border/70 lg:grid lg:grid-cols-2 lg:divide-y-0">
            {items.map((h, i) => (
              <li
                key={h.kind}
                className={cn(
                  "lg:border-border/70",
                  // A hairline above every row past the first line, and
                  // between the two columns.
                  i >= 2 && "lg:border-t",
                  i % 2 === 1 && "lg:border-l",
                  // An odd last row spans both columns, so no cell sits empty.
                  i === items.length - 1 && i % 2 === 0 && "lg:col-span-2",
                )}
              >
                <QuestionRow
                  question={HABIT_QUESTION[h.kind]}
                  answer={habitAnswer(h)}
                  evidence={habitEvidence(h, unit)}
                  method={HABIT_METHOD[h.kind]}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {pending.length > 0 ? (
          <LearningSteps
            title={PENDING_TITLE}
            steps={pending.map((p) => ({
              title: HABIT_QUESTION[p.kind],
              detail: habitGate(p.kind, p.gate, { tooShort }),
              done: false,
            }))}
            className={cn("px-4 py-4 sm:px-5", items.length > 0 && "border-t border-border/70")}
          />
        ) : null}
      </Surface>
    </PageSection>
  );
}
