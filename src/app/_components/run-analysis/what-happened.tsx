"use client";

import {
  CircleAlert,
  CircleCheck,
  Coffee,
  Crown,
  Eraser,
  Hourglass,
  Info,
  type LucideIcon,
  Pause,
  Timer,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RunAnalysisView } from "../use-run-analysis";
import type { CopyPart, CopyUnit, FindingCopy, FindingIcon } from "./finding-copy";
import { findingItems, shownFindings } from "./finding-items";
import { practiseLinkFor } from "./practise-link";

const ICON: Record<FindingIcon, LucideIcon> = {
  crown: Crown,
  eraser: Eraser,
  "circle-alert": CircleAlert,
  pause: Pause,
  hourglass: Hourglass,
  coffee: Coffee,
  "trending-down": TrendingDown,
  timer: Timer,
  "circle-check": CircleCheck,
  info: Info,
};

function Parts({ parts }: { parts: readonly CopyPart[] }) {
  return parts.map((p, i) =>
    typeof p === "string" ? (
      <span key={i}>{p}</span>
    ) : (
      <q key={i} className="font-mono">
        {p.word}
      </q>
    ),
  );
}

function Item({ copy }: { copy: FindingCopy }) {
  const Icon = ICON[copy.icon];
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">
          <Parts parts={copy.lead} />
        </p>
        {copy.follow ? (
          <p className="text-sm text-muted-foreground">
            <Parts parts={copy.follow} />
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** "What happened": the PB line when the run is a best, then the engine's
 *  findings in its order (a partial view opens with a note and keeps
 *  only what its part shows: finding-items.ts), then a link to a drill
 *  for the top one (signed in, never in a preview or the live clone).
 *  All ink (spec-50 §3.4). A plain block with its heading: the card
 *  around it is the one region (index.tsx). */
export function WhatHappened({
  view,
  isNewPb,
  previousBest,
  practise,
  unit,
}: {
  view: RunAnalysisView;
  isNewPb: boolean;
  previousBest: number | null | undefined;
  /** Signed in on a real result screen: the practise link may show. */
  practise: boolean;
  unit: CopyUnit;
}) {
  const { analysis } = view;
  const items = findingItems({
    analysis,
    unit,
    pb: isNewPb ? { noun: view.noun, wpm: view.input.wpm, previousBest } : null,
  });
  const link = practise ? practiseLinkFor(shownFindings(analysis)[0], true) : null;

  return (
    <div className="flex min-w-0 flex-col">
      <h2 className="text-sm font-semibold text-foreground">What happened</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((copy, i) => (
          <Item key={i} copy={copy} />
        ))}
      </ul>
      {link ? (
        <Link
          href={`/drills/${link.drillId}`}
          // Under the findings' text column, underlined like the page's
          // other ink links so it reads as a link at rest.
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-2 ml-4 h-11 self-start underline decoration-border underline-offset-4 hover:decoration-primary sm:h-8",
          )}
        >
          Practise with {link.title}
        </Link>
      ) : null}
    </div>
  );
}
