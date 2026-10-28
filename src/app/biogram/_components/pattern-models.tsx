"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { AdaptSnapshotOutput } from "@/types/adapt";
import { ModelTable } from "./model-table";

type Kind = "bigrams" | "trigrams" | "motor";

const KINDS: {
  id: Kind;
  label: string;
  pattern: string;
  empty: string;
}[] = [
  { id: "bigrams", label: "Pairs", pattern: "Pair", empty: "No letter-pair timings yet. Finish a test." },
  { id: "trigrams", label: "Triples", pattern: "Triple", empty: "No letter-triple timings yet." },
  { id: "motor", label: "Finger moves", pattern: "Movement", empty: "No finger-movement timings yet." },
];

/** The three pattern models behind one switch, so the page shows one
 *  table at a time instead of three long ones stacked. */
export function PatternModels({ snap }: { snap: AdaptSnapshotOutput }) {
  const [kind, setKind] = useState<Kind>("bigrams");
  const rows =
    kind === "bigrams"
      ? snap.bigrams
      : kind === "trigrams"
        ? snap.trigrams
        : snap.motorFeatures;
  const baseline =
    kind === "bigrams"
      ? snap.baselines.bigram
      : kind === "trigrams"
        ? snap.baselines.trigram
        : snap.baselines.motorFeature;
  const meta = KINDS.find((k) => k.id === kind) ?? KINDS[0];
  const counts: Record<Kind, number> = {
    bigrams: snap.bigrams.length,
    trigrams: snap.trigrams.length,
    motor: snap.motorFeatures.length,
  };

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        value={kind}
        onValueChange={setKind}
        ariaLabel="Pattern model"
        className="w-full flex-nowrap sm:w-fit [&>button]:flex-1 sm:[&>button]:flex-initial"
        options={KINDS.map((k) => ({
          value: k.id,
          label: (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {k.label}
              <span className="hidden tabular-nums opacity-70 sm:inline">
                {counts[k.id]}
              </span>
            </span>
          ),
        }))}
      />
      <ModelTable
        // Remount per model so sort + "show all" reset with the switch.
        key={kind}
        rows={rows}
        patternHeader={meta.pattern}
        baseline={baseline}
        emptyHint={meta.empty}
        initialLimit={12}
      />
    </div>
  );
}
