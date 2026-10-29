import { Circle, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type LearningStep = { title: string; detail: string; done: boolean };

type LearningStepsProps = {
  /** An `h3` above the list ("More answers as you practise"). */
  title?: string;
  steps: LearningStep[];
  className?: string;
};

/** What unlocks as you practise, in order: a check for each step reached
 *  and an empty circle for the rest, each with a muted detail that counts
 *  up ("After 5 Adapt tests of 25 words. 3 to go."). Never a percentage. */
export function LearningSteps({ title, steps, className }: LearningStepsProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
      <ol className="flex flex-col gap-3">
        {steps.map((step) => {
          const Icon = step.done ? CircleCheck : Circle;
          return (
            <li key={step.title} className="flex items-start gap-3">
              <Icon
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  step.done ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                  {step.done ? <span className="sr-only">. Done</span> : null}
                </p>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
