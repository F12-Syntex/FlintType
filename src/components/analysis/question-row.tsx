import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MethodDisclosure } from "./method-disclosure";

type QuestionRowProps = {
  /** "How long does a mistake cost you?" */
  question: string;
  /** "About 1.2 seconds each" */
  answer: string;
  evidence: ReactNode;
  /** The "How we know" line; omitted when there is nothing to add. */
  method?: ReactNode;
  className?: string;
};

/** One habit as a plain question and answer, with the evidence under it
 *  and a "How we know" disclosure. */
export function QuestionRow({ question, answer, evidence, method, className }: QuestionRowProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-4 py-4 sm:px-5", className)}>
      <p className="text-sm text-muted-foreground">{question}</p>
      <p className="text-base font-semibold text-foreground">{answer}</p>
      <div className="text-sm leading-relaxed text-foreground">{evidence}</div>
      {method ? <MethodDisclosure title="How we know">{method}</MethodDisclosure> : null}
    </div>
  );
}
