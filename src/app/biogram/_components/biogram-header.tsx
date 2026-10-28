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

function StatusPill({ snap }: { snap: AdaptSnapshotOutput | null }) {
  if (!snap) {
    return (
      <span className="inline-flex h-9 items-center gap-2 rounded-pill bg-muted px-3.5 text-sm text-muted-foreground">
        <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
        Loading
      </span>
    );
  }
  const cold = snap.cold;
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-pill px-3.5 text-sm font-medium",
        cold ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          cold ? "bg-muted-foreground/40" : "bg-primary",
        )}
        aria-hidden
      />
      {cold ? "Cold start" : "Warm"}
      <span className="opacity-50" aria-hidden>
        ·
      </span>
      <span className="tabular-nums">
        {snap.totalBigramSamples.toLocaleString()} samples
      </span>
    </span>
  );
}
