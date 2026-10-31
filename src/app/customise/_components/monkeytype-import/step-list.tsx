"use client";

import { Check, Loader2, X } from "lucide-react";
import type { Ref } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StepStatus } from "./run-steps";
import type { MtStep } from "./use-monkeytype-import";

const STATUS_WORD: Record<StepStatus, string> = {
  waiting: "Waiting",
  active: "In progress",
  done: "Done",
  failed: "Failed",
};

/** The import's steps, ticked off one after another under a progress
 *  bar. Focusable (tabIndex -1) so focus has somewhere to rest inside
 *  the dialog while the buttons are busy. */
export function StepList({
  steps,
  label,
  showProgress = true,
  ref,
}: {
  steps: MtStep[];
  label: string;
  showProgress?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const done = steps.filter((s) => s.status === "done").length;
  const active = steps.find((s) => s.status === "active");
  return (
    <div ref={ref} tabIndex={-1} className="flex flex-col gap-4 outline-none">
      {showProgress ? (
        <Progress
          value={steps.length > 0 ? Math.round((done / steps.length) * 100) : 0}
          aria-label={label}
          aria-valuetext={`${done} of ${steps.length} steps done`}
        />
      ) : null}
      <ol aria-label={label} className="flex flex-col gap-0.5">
        {steps.map((step) => (
          <li
            key={step.id}
            aria-current={step.status === "active" ? "step" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-2.5 transition-colors duration-200",
              step.status === "active" && "bg-muted/70",
            )}
          >
            <StepMark status={step.status} />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm transition-colors duration-200",
                step.status === "waiting"
                  ? "text-muted-foreground"
                  : step.status === "failed"
                    ? "font-medium text-destructive"
                    : "font-medium text-foreground",
              )}
            >
              {step.label}
            </span>
            {step.detail ? (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {step.detail}
              </span>
            ) : null}
            <span className="sr-only">{STATUS_WORD[step.status]}</span>
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status">
        {active ? active.label : ""}
      </p>
    </div>
  );
}

function StepMark({ status }: { status: StepStatus }) {
  if (status === "active") {
    return (
      <Loader2
        aria-hidden
        className="size-5 shrink-0 text-foreground motion-safe:animate-spin"
      />
    );
  }
  if (status === "done") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-50 motion-safe:duration-200"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <X className="size-3" strokeWidth={3} />
      </span>
    );
  }
  // A ring, not a border: the Outlines setting can hide every border.
  return <span aria-hidden className="size-5 shrink-0 rounded-full ring-2 ring-foreground/15 ring-inset" />;
}
