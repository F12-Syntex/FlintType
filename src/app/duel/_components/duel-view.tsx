"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UserTag } from "@/components/ft";
import { BackendError, useBackend } from "@/lib/backend";
import type { Duel } from "@/types/duel";
import { TypingSurface, type TypingResult } from "@/components/typing-surface";
import { DuelOutcome } from "./duel-outcome";

/** /duel/[id]. Loads the duel, then branches by viewer + status:
 *    - completed → the outcome scoreboard;
 *    - I'm the opponent + pending → race the challenger's ghost, submit;
 *    - I'm the challenger + pending → "waiting on them" with my run. */
export function DuelView({ id }: { id: string }) {
  const backend = useBackend();
  const { user, isLoaded, isSignedIn } = useUser();
  const [duel, setDuel] = useState<Duel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      setError("Sign in to view this duel.");
      return;
    }
    let cancelled = false;
    backend.duels
      .get({ id })
      .then((d) => {
        if (!cancelled) setDuel(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof BackendError && err.code === "NOT_FOUND") {
          setError("This duel doesn't exist.");
        } else if (err instanceof BackendError && err.code === "FORBIDDEN") {
          setError("This duel isn't yours.");
        } else {
          setError(err instanceof Error ? err.message : "Couldn't load the duel.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, id, isLoaded, isSignedIn]);

  async function handleFinish(result: TypingResult) {
    if (!duel) return;
    setSubmitting(true);
    try {
      const done = await backend.duels.submitResult({
        id: duel.id,
        wpm: result.wpm,
        accuracy: result.accuracy,
      });
      setDuel(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your result.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Shell>{<Muted>Loading the duel…</Muted>}</Shell>;
  }
  if (error || !duel) {
    return (
      <Shell>
        <p className="rounded-md border border-border bg-card px-4 py-3 text-sm text-primary">
          {error ?? "Couldn't load the duel."}
        </p>
      </Shell>
    );
  }

  if (duel.status === "completed") {
    return (
      <Shell>
        <DuelOutcome duel={duel} />
      </Shell>
    );
  }

  const me = user?.id ?? null;
  const amOpponent = me === duel.opponent.userId;

  if (amOpponent) {
    return (
      <Shell>
        <header className="flex flex-col gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Duel · beat the run
          </span>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <span>{duel.challenger.name}</span>
            {duel.challenger.tags.map((t) => (
              <UserTag key={t} tag={t} size="sm" />
            ))}
            <span className="font-medium text-muted-foreground">
              dares you to beat {Math.round(duel.challengerWpm)} wpm
            </span>
          </h1>
        </header>
        {submitting ? (
          <Muted>Saving your result…</Muted>
        ) : (
          <TypingSurface
            words={duel.words}
            ghost={duel.challengerWpmHistory}
            onFinish={handleFinish}
          />
        )}
      </Shell>
    );
  }

  // Challenger view of a pending duel — waiting on the opponent.
  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Duel · sent
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Waiting for {duel.opponent.name} to take your challenge
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          Your run: {Math.round(duel.challengerWpm)} wpm ·{" "}
          {Math.round(duel.challengerAccuracy)}% acc on {duel.words.length} words.
        </p>
      </header>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-8 sm:py-12">
      {children}
    </main>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}
