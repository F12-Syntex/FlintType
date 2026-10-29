"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import type { NextStep, PracticeAction } from "@/types/insights";
import type { TestKind } from "./copy-phrases";
import {
  actionHref,
  actionLabel,
  alternativeLines,
  gainLine,
  NEXT_STEP_LABEL,
  nextStepBecause,
  nextStepTitle,
  OTHER_WAYS,
} from "./next-step-copy";

/** The verdict card's right column (spec-40 §3.1): one step, why, and the
 *  page's only filled primary. Locked drills never reach here (the
 *  server only offers ready ones). */
export function NextStepPanel({
  step,
  analysed,
  kind,
  unit,
}: {
  step: NextStep;
  analysed: boolean;
  kind: TestKind;
  unit: TypingSpeedUnit;
}) {
  const gain = gainLine(step, unit);
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t border-border p-5 sm:p-6 md:border-t-0 md:border-l">
      <p className="text-sm font-medium text-muted-foreground">{NEXT_STEP_LABEL}</p>
      <h2 className="text-lg font-semibold tracking-tight text-balance text-foreground">{nextStepTitle(step)}</h2>
      <p className="text-sm leading-relaxed text-foreground">{nextStepBecause(step, kind, { analysed })}</p>
      {gain ? <p className="text-sm leading-relaxed font-medium text-foreground">{gain}</p> : null}
      <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={actionHref(step.action)} className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
          {actionLabel(step.action)}
        </Link>
        {step.alternatives.length > 0 ? <OtherWays alternatives={step.alternatives} /> : null}
      </div>
    </div>
  );
}

function AlternativeBody({ a }: { a: PracticeAction }) {
  const { title, about } = alternativeLines(a);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{title}</span>
      {about ? <span className="text-xs text-muted-foreground">{about}</span> : null}
    </span>
  );
}

const TRIGGER = "h-11 w-full text-muted-foreground hover:text-foreground sm:h-9 sm:w-auto";

/** "Other ways to practise": a dropdown from md, a bottom sheet on phones,
 *  each row a drill's title over its one-line description. */
function OtherWays({ alternatives }: { alternatives: PracticeAction[] }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (isMobile) {
    return (
      <>
        <Button type="button" variant="ghost" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TRIGGER}>
          {OTHER_WAYS}
        </Button>
        <MobileSheet open={open} onOpenChange={setOpen} title={OTHER_WAYS}>
          <ul className="flex flex-col gap-1 px-3 py-3">
            {alternatives.map((a) => (
              <li key={actionHref(a)}>
                <Link
                  href={actionHref(a)}
                  className="flex min-h-11 items-center rounded-xl px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring/60"
                >
                  <AlternativeBody a={a} />
                </Link>
              </li>
            ))}
          </ul>
        </MobileSheet>
      </>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={TRIGGER}>
          {OTHER_WAYS}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {alternatives.map((a) => (
          <DropdownMenuItem key={actionHref(a)} asChild className={cn("min-h-11 py-2.5")}>
            <Link href={actionHref(a)}>
              <AlternativeBody a={a} />
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
