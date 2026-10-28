"use client";

import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput } from "@/types/adapt";

/** Page header: the h1, one line on what the page is, and a status pill
 *  (warm / cold start + sample count) beside a Refresh button. */
export function BiogramHeader({
  snap,
  loading,
  onRefresh,
}: {
  snap: AdaptSnapshotOutput | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <PageHeader
      eyebrow="Biogram"
      title="What the adapt loop knows about you"
      description="Every keystroke feeds three small models: letter pairs, letter triples and finger movements. This is the X-ray of what they've learned and how they pick your next words."
      aside={
        <>
          <StatusPill snap={snap} />
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            aria-label={loading ? "Refreshing snapshot" : "Refresh snapshot"}
          >
            <RefreshCw
              aria-hidden
              className={cn(loading && "motion-safe:animate-spin")}
            />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </>
      }
    />
  );
}

/** Model status. Neutral on purpose: it's a status, not a selection or
 *  an action, so it stays ink (the Refresh button and the selected
 *  switches carry the orange). Green dot when warm, dim when cold. */
function StatusPill({ snap }: { snap: AdaptSnapshotOutput | null }) {
  const shell =
    "inline-flex h-9 items-center gap-2 rounded-pill border border-border bg-card px-3.5 text-sm";
  if (!snap) {
    return (
      <span className={cn(shell, "text-muted-foreground")}>
        <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
        Loading
      </span>
    );
  }
  const cold = snap.cold;
  return (
    <span className={cn(shell, "text-foreground")}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          cold ? "bg-muted-foreground/50" : "bg-ft-ok",
        )}
        aria-hidden
      />
      <span className="font-medium">{cold ? "Cold start" : "Warm"}</span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="tabular-nums text-muted-foreground">
        {snap.totalBigramSamples.toLocaleString()} samples
      </span>
    </span>
  );
}
