"use client";

import { Lock, Skull, Target, Zap } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type DrillTile, drillSpecLine, isolationPattern } from "./drill-tiles";
import type { DrillSpec } from "./drills-data";

/** Card shell shared by every tile: the <Surface> recipe (ui-law §21)
 *  stretched to the grid row so tiles in a row line up. */
const TILE =
  "flex h-full flex-col gap-3 rounded-2xl border p-4 sm:p-5";

/** Ready tiles lift on hover; the whole tile is the link. */
const TILE_LINK = cn(
  TILE,
  "group border-border bg-card text-card-foreground shadow-card outline-none",
  "transition-[transform,box-shadow,border-color] duration-200 ease-out",
  "hover:border-foreground/20 hover:shadow-float motion-safe:hover:-translate-y-0.5",
  "focus-visible:ring-3 focus-visible:ring-ring/40",
);

export function DrillTileCard({
  tile,
  burstReps,
}: {
  tile: DrillTile;
  burstReps: number;
}) {
  if (tile.type === "isolation") {
    return <IsolationTile drills={tile.drills} />;
  }
  const { drill } = tile;
  if (!drill.ready) return <LockedTile drill={drill} />;
  return (
    <Link href={`/drills/${drill.id}`} className={TILE_LINK}>
      <KindBadge drill={drill} />
      <TileText title={drill.title} summary={drill.summary} />
      <p className="mt-auto text-xs tabular-nums text-muted-foreground">
        {drillSpecLine(drill, burstReps)}
      </p>
    </Link>
  );
}

/** Every isolation drill folded into one tile: a pill per weak pattern,
 *  each linking to its own drill. Not a link itself (it holds links). */
function IsolationTile({ drills }: { drills: readonly DrillSpec[] }) {
  const ready = drills.filter((d) => d.ready);
  if (ready.length === 0) {
    const placeholder = drills[0];
    return placeholder ? (
      <LockedTile drill={placeholder} title="Isolate weak pairs" />
    ) : null;
  }
  return (
    <div
      className={cn(
        TILE,
        "border-border bg-card text-card-foreground shadow-card",
      )}
    >
      <Badge icon={<Target aria-hidden />}>Isolation</Badge>
      <TileText
        title="Isolate weak pairs"
        summary="One slow motion drilled across many everyday words. Pick a pair to start."
      />
      <ul className="mt-auto flex flex-wrap gap-2 pt-1" aria-label="Weak pairs">
        {ready.map((d) => {
          const pattern = isolationPattern(d) ?? d.title;
          return (
            <li key={d.id}>
              <Link
                href={`/drills/${d.id}`}
                aria-label={`Isolate "${pattern}"`}
                title={d.summary}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 min-w-11 px-4 font-semibold",
                )}
              >
                {pattern}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Locked tile: same geometry, dashed and flat, with the unlock
 *  condition in place of the spec line. Inert (not focusable). */
function LockedTile({ drill, title }: { drill: DrillSpec; title?: string }) {
  return (
    <div
      aria-disabled
      className={cn(TILE, "border-dashed border-border bg-card/40")}
    >
      <div className="flex items-center justify-between gap-2">
        <KindBadge drill={drill} />
        <Badge icon={<Lock aria-hidden />}>Locked</Badge>
      </div>
      <h3 className="text-base font-semibold tracking-tight text-muted-foreground sm:text-lg">
        {title ?? drill.title}
      </h3>
      <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
        {drill.summary}
      </p>
    </div>
  );
}

function TileText({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground max-sm:hidden">
        {summary}
      </p>
    </div>
  );
}

/** Neutral kind label: Skull for sudden death, Zap for burst, Target
 *  for isolation. Never coloured, so the recommended drill keeps the
 *  page's one orange accent. */
export function KindBadge({ drill }: { drill: DrillSpec }) {
  const icon =
    drill.kind === "sudden-death" ? (
      <Skull aria-hidden />
    ) : isolationPattern(drill) !== null || drill.id === "isolation" ? (
      <Target aria-hidden />
    ) : (
      <Zap aria-hidden />
    );
  return <Badge icon={icon}>{drill.contextLabel}</Badge>;
}

function Badge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-pill bg-muted px-2.5 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
      {icon}
      {children}
    </span>
  );
}
