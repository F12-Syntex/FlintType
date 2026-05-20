"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Tag, UserTag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { Duel, ListDuelsOutput } from "@/types/duel";

type TabId = "incoming" | "outgoing";

const net = (w: number, a: number) => Math.round(w * (Math.max(0, Math.min(100, a)) / 100));

/** /duels — challenges you've received (Incoming) and sent (Sent). */
export function DuelsView() {
  const { isLoaded, isSignedIn } = useUser();
  const backend = useBackend();
  const [tab, setTab] = useState<TabId>("incoming");
  const [data, setData] = useState<ListDuelsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await backend.duels.list());
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setError("Sign in to see your duels.");
      } else {
        setError(err instanceof Error ? err.message : "Couldn't load duels.");
      }
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void load();
  }, [isLoaded, isSignedIn, load]);

  const list = tab === "incoming" ? (data?.incoming ?? []) : (data?.outgoing ?? []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-6 sm:gap-8 sm:py-10">
      <header className="flex flex-col gap-2">
        <Tag tone="dim">Duels</Tag>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Beat my run
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Challenge a friend from their profile to beat one of your runs, or
          take on a challenge waiting for you.
        </p>
      </header>

      {isLoaded && !isSignedIn ? (
        <p className="rounded-md border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          Sign in to see your duels.
        </p>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Duels"
            className="flex gap-1 rounded-md border border-border bg-muted/40 p-1"
          >
            {(["incoming", "outgoing"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === tab}
                onClick={() => setTab(t)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                  t === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "incoming" ? "Incoming" : "Sent"}
                {data ? (
                  <span className="tabular-nums text-muted-foreground">
                    {(t === "incoming" ? data.incoming : data.outgoing).length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {error ? (
            <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-primary">
              {error}
            </p>
          ) : loading && !data ? (
            <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Loading…
            </p>
          ) : list.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
              {tab === "incoming"
                ? "No challenges waiting. When a friend dares you to beat a run, it shows up here."
                : "You haven't challenged anyone yet. Open a friend's profile and hit Duel."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list.map((d) => (
                <li key={d.id}>
                  <DuelRow duel={d} tab={tab} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function DuelRow({ duel, tab }: { duel: Duel; tab: TabId }) {
  const other = tab === "incoming" ? duel.challenger : duel.opponent;
  const completed = duel.status === "completed";
  const cNet = net(duel.challengerWpm, duel.challengerAccuracy);
  const oNet = net(duel.opponentWpm ?? 0, duel.opponentAccuracy ?? 0);
  const opponentWon = oNet > cNet;

  let line: string;
  if (!completed) {
    line =
      tab === "incoming"
        ? `Dares you to beat ${Math.round(duel.challengerWpm)} wpm`
        : `Waiting on ${other.name}`;
  } else {
    line = `${cNet} vs ${oNet} net wpm · ${
      opponentWon ? duel.opponent.name : duel.challenger.name
    } won`;
  }

  return (
    <Link
      href={`/duel/${duel.id}`}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-accent"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {other.name}
          </span>
          {other.tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" />
          ))}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {line}
        </span>
      </span>
      {tab === "incoming" && !completed ? (
        <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
          Take it
        </span>
      ) : (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {completed ? "Result" : "Pending"}
        </span>
      )}
    </Link>
  );
}
