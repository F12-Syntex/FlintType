"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useBackend } from "@/lib/backend";
import { DuelTyper, type DuelRunResult } from "./duel-typer";
import { generateDuelWords } from "./words";

const WORD_COUNT = 25;

/** /duel/new?opponent=<userId>. The challenger types a fresh passage to
 *  set the run; on finish we snapshot it into a duel and notify the
 *  opponent. No ghost here — this run *is* the ghost the opponent will
 *  later race. */
export function DuelNewView() {
  const params = useSearchParams();
  const opponentId = params.get("opponent");
  const backend = useBackend();
  const { isLoaded, isSignedIn } = useUser();
  const [words] = useState(() => generateDuelWords(WORD_COUNT));
  const [phase, setPhase] = useState<"type" | "sending" | "sent" | "error">(
    "type",
  );
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);

  async function handleFinish(result: DuelRunResult) {
    if (!opponentId) return;
    setPhase("sending");
    try {
      const { id } = await backend.duels.create({
        opponentId,
        words,
        mode: "casual",
        durationOrWordCount: words.length,
        wpm: result.wpm,
        accuracy: result.accuracy,
        wpmHistory: result.wpmHistory,
      });
      setSentId(id);
      setPhase("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the challenge.");
      setPhase("error");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-8 sm:py-12">
      {isLoaded && !isSignedIn ? (
        <Notice>Sign in to challenge a friend.</Notice>
      ) : !opponentId ? (
        <Notice>
          Open a duel from a friend&apos;s profile — pick someone to challenge.
        </Notice>
      ) : phase === "sent" ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Challenge sent
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Your run is set. The race is on.
            </h1>
            <p className="text-sm text-muted-foreground">
              They&apos;ll get a notification to beat it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sentId ? (
              <Link
                href={`/duel/${sentId}`}
                className="rounded-md border border-border bg-background px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                View duel
              </Link>
            ) : null}
            <Link
              href="/duels"
              className="rounded-md border border-border bg-background px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              All duels
            </Link>
          </div>
        </section>
      ) : (
        <>
          <header className="flex flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              New duel · set your run
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Type this passage to set the bar
            </h1>
            <p className="text-sm text-muted-foreground">
              Your speed becomes the ghost your friend has to beat.
            </p>
          </header>
          {phase === "sending" ? (
            <Notice>Sending your challenge…</Notice>
          ) : (
            <DuelTyper words={words} onFinish={handleFinish} />
          )}
          {phase === "error" ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </>
      )}
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
