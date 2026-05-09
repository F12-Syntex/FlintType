"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistorySummaryOutput } from "@/types/history";
import { AppChrome } from "../../_components/app-chrome";
import { BurstSurface } from "../_components/burst-surface";
import { DrillHeader } from "../_components/drill-header";
import { buildDrills, type DrillSpec } from "../_components/drills-data";
import { SuddenDeathSurface } from "../_components/sudden-death-surface";

/** Per-drill route — `/app/drills/<id>` resolves to one of seven
 *  drill specs and renders the runner that fits its kind. The drill
 *  catalog is rebuilt from `backend.history.summary()` because three
 *  of the seven specs (weakness, trigram-burst when warm) read user
 *  data; the rest are deterministic. The dynamic page is a `"use
 *  client"` component because the build needs to happen against the
 *  signed-in user's snapshot, not at build time.
 *
 *  Status flow:
 *    loading        — snapshot in flight
 *    error          — fetch failed (auth, network, etc.)
 *    not-found      — id doesn't match any catalog spec
 *    locked         — id matches but the spec needs more user data
 *    ready          — render the matching surface (sudden-death / burst) */
export default function DrillRunnerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const backend = useBackend();
  const [snapshot, setSnapshot] = useState<HistorySummaryOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnapshot(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          setError("Sign in to load this drill.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load drill.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const drill = useMemo<DrillSpec | null>(() => {
    if (!snapshot) return null;
    const drills = buildDrills({
      weakestPairs: snapshot.weakestPairs ?? [],
      weakestTrigrams: snapshot.weakestTrigrams ?? [],
      cold: snapshot.cold ?? false,
      seed: Date.now(),
    });
    return drills.find((d) => d.id === id) ?? null;
  }, [snapshot, id]);

  return (
    <AppChrome>
      {loading ? (
        <Status message="Reading your model…" />
      ) : error ? (
        <Status message={error} tone="primary" />
      ) : !drill ? (
        <NotFound id={id} />
      ) : !drill.ready ? (
        <Locked drill={drill} />
      ) : drill.kind === "sudden-death" ? (
        <SuddenDeathSurface
          title={drill.title}
          subtitle={drill.contextLabel}
          words={drill.words}
        />
      ) : (
        <BurstSurface
          title={drill.title}
          subtitle={drill.contextLabel}
          items={drill.items}
          thresholdWpm={drill.thresholdWpm}
          repsPerItem={drill.repsPerItem}
        />
      )}
    </AppChrome>
  );
}

function Status({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "muted" | "primary";
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-10">
      <p
        className={`text-sm ${tone === "primary" ? "text-primary" : "text-muted-foreground"}`}
      >
        {message}
      </p>
    </div>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <>
      <DrillHeader title="Drill not found" subtitle="Unknown id" />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-5 py-12 text-center">
        <Tag>404</Tag>
        <h2 className="max-w-xl text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          No drill called &ldquo;{id}&rdquo;.
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The picker on the drills page is the source of truth — that
          link is either out-of-date or was hand-typed wrong.
        </p>
        <Link
          href="/app/drills"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to drills
        </Link>
      </div>
    </>
  );
}

function Locked({ drill }: { drill: DrillSpec }) {
  return (
    <>
      <DrillHeader title={drill.title} subtitle={drill.contextLabel} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-5 py-12 text-center">
        <Tag>Locked</Tag>
        <h2 className="max-w-xl text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Need more data first.
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {drill.description}
        </p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground/80">
          Run a few normal practice tests so we can see your weakest
          letter pairs — this drill unlocks once the model has signal.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go practise
        </Link>
      </div>
    </>
  );
}
