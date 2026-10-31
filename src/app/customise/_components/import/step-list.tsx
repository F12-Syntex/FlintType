"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleX, LoaderCircle, Minus, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { enterMotion } from "./import-motion";
import type { Step, StepStatus } from "./import-stage";

/** The import's step sequences (ui-law §12.10), as ordered lists with an
 *  ink state icon per row.
 *  - The three check steps are two-line rows (label, then a detail line
 *    reserved from the start), so no row moves as the sequence plays.
 *    Detail parts that are sentences (`stack`) take a line each. A
 *    failure shows under the step that failed; the screen's heading,
 *    which takes focus, is described by it, so it's read once and never
 *    as a second alert.
 *  - The import's groups are one line each (name, then the count on the
 *    right), so every group fits the dialog and the receipt needs no
 *    scrolling. A working row is still scrolled into view if the body is
 *    too short. After Undo the rows stay, each marked as put back. */

const STATE_TEXT: Record<StepStatus, string> = {
  pending: "Not started",
  working: "In progress",
  done: "Done",
  failed: "Failed",
  stopped: "Not imported",
};

function StepIcon({ status, reverted }: { status: StepStatus; reverted?: boolean }) {
  const reduce = useReducedMotion();
  if (reverted && status === "done") {
    return (
      <motion.span key="put-back" {...enterMotion("check", reduce)} className="flex">
        <Undo2 aria-hidden className="size-4 text-foreground" />
      </motion.span>
    );
  }
  switch (status) {
    case "pending":
      return <span aria-hidden className="size-2 rounded-full bg-foreground/20" />;
    case "working":
      return <LoaderCircle aria-hidden className="size-4 text-foreground/70 motion-safe:animate-spin" />;
    case "done":
      // The spinner gives way to the check, which fades and scales in.
      return (
        <motion.span key="done" {...enterMotion("check", reduce)} className="flex">
          <Check aria-hidden strokeWidth={2.5} className="size-4 text-foreground" />
        </motion.span>
      );
    case "failed":
      return <CircleX aria-hidden className="size-4 text-destructive" />;
    case "stopped":
      return <Minus aria-hidden className="size-4 text-muted-foreground" />;
  }
}

function StateCell({ status, reverted }: { status: StepStatus; reverted?: boolean }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      <StepIcon status={status} reverted={reverted} />
      <span className="sr-only">{reverted && status === "done" ? "Put back" : STATE_TEXT[status]}</span>
    </span>
  );
}

const labelClass = (status: StepStatus) =>
  cn(
    "text-sm transition-colors duration-150 motion-reduce:transition-none",
    status === "pending" || status === "stopped" ? "text-muted-foreground" : "font-medium text-foreground",
  );

export function StepList({
  label,
  steps,
  failure,
  failureId,
}: {
  label: string;
  steps: readonly Step[];
  /** Problem and follow-up, shown under the failed step. */
  failure?: [string, string] | null;
  /** The id the heading's aria-describedby points at. */
  failureId?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <ol aria-label={label} className="mt-3 flex flex-col">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 py-2">
          <span className="mt-px">
            <StateCell status={step.status} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={labelClass(step.status)}>{step.label}</p>
            {step.status === "failed" && failure ? (
              <div id={failureId} className="mt-0.5 flex flex-col gap-0.5 text-sm">
                <p className="text-destructive">{failure[0]}</p>
                <p className="text-muted-foreground">{failure[1]}</p>
              </div>
            ) : (
              <motion.p
                key={step.detail.join("|")}
                {...(step.detail.length > 0 ? enterMotion("detail", reduce) : {})}
                className={cn(
                  "mt-0.5 flex min-h-5 text-sm text-muted-foreground tabular-nums",
                  step.stack ? "flex-col" : "flex-wrap gap-x-3",
                  step.status === "failed" && "text-destructive",
                )}
              >
                {step.detail.map((part, j) => (
                  <span key={j} className="[overflow-wrap:anywhere]">
                    {part}
                  </span>
                ))}
              </motion.p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The groups being imported, one line each. `reverted` marks every
 *  imported group as put back (after Undo). A group a stopped import
 *  didn't import reads "Not imported", with a muted dash. */
export function GroupStepList({
  label,
  steps,
  reverted = false,
}: {
  label: string;
  steps: readonly Step[];
  reverted?: boolean;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const working = steps.findIndex((s) => s.status === "working");

  // Keep the group being written in view on a short screen.
  useEffect(() => {
    if (working < 0) return;
    const row = listRef.current?.children[working];
    row?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [working, reduce]);

  return (
    <ol ref={listRef} aria-label={label} className="mt-3 flex flex-col">
      {steps.map((step, i) => {
        const failed = step.status === "failed";
        return (
          <li key={i} className="flex min-h-7 flex-wrap items-center gap-x-3 py-1">
            <StateCell status={step.status} reverted={reverted} />
            <span className={cn("min-w-0 flex-1 truncate", labelClass(step.status))}>{step.label}</span>
            {step.detail.length > 0 ? (
              <motion.span
                key={step.detail.join("|")}
                {...enterMotion("detail", reduce)}
                className={cn("text-sm tabular-nums", failed ? "basis-full pl-8 text-destructive" : "shrink-0 text-muted-foreground")}
              >
                {step.detail.join(" ")}
              </motion.span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
