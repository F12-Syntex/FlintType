"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import { ModePicker } from "./mode-picker";
import type { RaceModeId } from "./race-data";
import { useRace } from "./race-state";

/** Top race strip, sibling of practice's `<ModeBar>`. Same centred
 *  horizontal `<Field>` lockup convention, same `px-7 py-4` shell,
 *  no border-b. Two fields:
 *    - mode   → dropdown of every race mode
 *    - action → phase-aware button (Find race / Race again / Abandon)
 *
 *  The phase status used to live here as a `● QUEUE`-style bullet pill
 *  but that read as a console-output cliché. It now lives in the
 *  `<PhaseRow>` above the passage where the rest of the per-phase
 *  signal already lives — one place to look, not two. */
export function RaceControls() {
  const { state, modeId, setModeId, enterQueue, restart, abandon } = useRace();
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-center gap-x-8 gap-y-4 px-7 py-4">
      <Field label="mode">
        <ModePicker modeId={modeId} onPick={setModeId} disabled={!allowSwitch} />
      </Field>
      <Field label="action">
        <ActionButton
          phase={state.phase}
          onEnter={enterQueue}
          onRestart={restart}
          onAbandon={abandon}
        />
      </Field>
      {state.phase === "queue" ? (
        <Field label="challenge">
          <CreateChallengeButton modeId={modeId} />
        </Field>
      ) : null}
    </div>
  );
}

function CreateChallengeButton({ modeId }: { modeId: RaceModeId }) {
  const backend = useBackend();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const onClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await backend.race.challenge.create({ modeId });
      writeHostStorage(res.slug, {
        roomId: res.roomId,
        sessionToken: res.sessionToken,
        words: res.words,
        totalChars: res.totalChars,
        modeId: res.modeId as RaceModeId,
      });
      router.push(`/race/c/${res.slug}`);
    } catch {
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
        "transition-colors duration-150 hover:border-foreground/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        pending && "cursor-wait opacity-60",
      )}
    >
      Create link
    </button>
  );
}

/** Label-on-top wrapper matching practice's ModeBar `<Field>` exactly.
 *  Same `text-[10px] tracking-[0.2em] uppercase` eyebrow + `gap-1.5`
 *  so the two surfaces line up when viewed side-by-side. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Phase-aware right-hand action. Three button shapes share the same
 *  geometry (h-8, rounded-md, font-mono uppercase tracking) so they
 *  line up against the mode chip across phases:
 *
 *    queue / finished → filled primary CTA (the move that opens up
 *                       the loop: Find race, Race again)
 *    racing           → hairline ghost (Abandon — recoverable, soft)
 *    matching / lobby /
 *    countdown        → disabled ghost (system is doing the work) */
function ActionButton({
  phase,
  onEnter,
  onRestart,
  onAbandon,
}: {
  phase: string;
  onEnter: () => void;
  onRestart: () => void;
  onAbandon: () => void;
}) {
  if (phase === "queue") {
    return <PrimaryButton onClick={onEnter}>Find race</PrimaryButton>;
  }
  if (phase === "matching") {
    return <DisabledButton>Matching</DisabledButton>;
  }
  if (phase === "lobby") {
    return <DisabledButton>Starting</DisabledButton>;
  }
  if (phase === "countdown") {
    return <DisabledButton>Get ready</DisabledButton>;
  }
  if (phase === "finished") {
    return <PrimaryButton onClick={onRestart}>Race again</PrimaryButton>;
  }
  return <GhostButton onClick={onAbandon}>Abandon</GhostButton>;
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3.5",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
        "transition-[background-color,transform] duration-150 hover:bg-primary/90 active:translate-y-[0.5px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        "transition-colors duration-150 hover:border-foreground/40 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {children}
    </button>
  );
}

/** Same shape as GhostButton but visually quieter — used when the
 *  system is running and the user has no action to take (matching,
 *  starting, get ready). A dimmed border tells the eye "this is the
 *  same control surface, but inert right now" without forcing the
 *  cursor to read disabled-grey as failed. */
function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-disabled
      className={cn(
        "inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-md border border-dashed border-border/70 px-3",
        "font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70",
      )}
    >
      {children}
    </span>
  );
}
