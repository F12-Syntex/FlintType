"use client";

import { RefreshCw } from "lucide-react";
import { StatusText } from "@/components/analysis/status-text";
import { PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdaptSnapshotOutput } from "@/types/adapt";

/** Page header: the h1, one line on what the page is, and the model's
 *  status (warm or cold start) beside a Refresh button. */
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
          <ModelStatus snap={snap} />
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

/** Model status in words beside a small dot: no border, no fill. It's
 *  a status, not a selection or an action, so it stays ink (the Refresh
 *  button and the selected switches carry the orange). The sample count
 *  lives in the overview, beside the patterns it came from. */
function ModelStatus({ snap }: { snap: AdaptSnapshotOutput | null }) {
  if (!snap) return <StatusText tone="learning">Loading</StatusText>;
  return (
    <StatusText tone={snap.cold ? "learning" : "ok"}>
      {snap.cold ? "Cold start" : "Warm"}
    </StatusText>
  );
}
