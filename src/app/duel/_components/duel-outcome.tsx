"use client";

import Link from "next/link";
import { UserTag } from "@/components/ft";
import { cn } from "@/lib/utils";
import type { Duel } from "@/types/duel";

const net = (w: number, a: number) => Math.round(w * (Math.max(0, Math.min(100, a)) / 100));

/** Final scoreboard for a completed duel: challenger vs opponent on net
 *  WPM, the winner inked + bold. A verdict line names who took it. */
export function DuelOutcome({ duel }: { duel: Duel }) {
  const cNet = net(duel.challengerWpm, duel.challengerAccuracy);
  const oNet = net(duel.opponentWpm ?? 0, duel.opponentAccuracy ?? 0);
  const opponentWon = oNet > cNet;
  const tie = oNet === cNet;

  const verdict = tie
    ? "Dead heat."
    : opponentWon
      ? `${duel.opponent.name} won.`
      : `${duel.challenger.name} held the line.`;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Duel result
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {verdict}
        </h1>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 rounded-md border border-border bg-card px-4 py-5 sm:px-6">
        <Side
          duel={duel}
          who="challenger"
          netWpm={cNet}
          win={!opponentWon && !tie}
          align="end"
        />
        <span aria-hidden className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          vs
        </span>
        <Side
          duel={duel}
          who="opponent"
          netWpm={oNet}
          win={opponentWon && !tie}
          align="start"
        />
      </div>

      <Link
        href="/duels"
        className="w-fit rounded-md border border-border bg-background px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        All duels
      </Link>
    </section>
  );
}

function Side({
  duel,
  who,
  netWpm,
  win,
  align,
}: {
  duel: Duel;
  who: "challenger" | "opponent";
  netWpm: number;
  win: boolean;
  align: "start" | "end";
}) {
  const p = who === "challenger" ? duel.challenger : duel.opponent;
  const wpm = who === "challenger" ? duel.challengerWpm : (duel.opponentWpm ?? 0);
  const acc =
    who === "challenger" ? duel.challengerAccuracy : (duel.opponentAccuracy ?? 0);
  const href = `/profile/${p.username ?? p.userId}`;
  return (
    <div className={cn("flex flex-col gap-1", align === "end" ? "items-end" : "items-start")}>
      <Link
        href={href}
        className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-foreground hover:text-primary"
      >
        {p.name}
        {p.tags.map((t) => (
          <UserTag key={t} tag={t} size="sm" />
        ))}
      </Link>
      <span
        className={cn(
          "text-3xl tabular-nums sm:text-4xl",
          win ? "font-bold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        {netWpm}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
        {Math.round(wpm)} wpm · {Math.round(acc)}% acc
      </span>
    </div>
  );
}
