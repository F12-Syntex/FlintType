"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import { ModePicker } from "./mode-picker";
import { RACE_MODES, type RaceModeId } from "./race-data";
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
  const {
    state,
    modeId,
    setModeId,
    enterQueue,
    startCountdown,
    restart,
    abandon,
    isChallenge,
  } = useRace();
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";
  // "Bare" phases — `queue` and `finished` — let mode switches go
  // straight through. Every other phase (matching / lobby /
  // countdown / racing) represents a live commitment that the user
  // shouldn't lose to a misclick; gate them behind a confirm dialog.
  const requiresConfirm =
    state.phase === "matching" ||
    state.phase === "lobby" ||
    state.phase === "countdown" ||
    state.phase === "racing";
  const [pendingMode, setPendingMode] = useState<RaceModeId | null>(null);

  const onPickMode = useCallback(
    (next: RaceModeId) => {
      if (next === modeId) return;
      if (requiresConfirm) {
        setPendingMode(next);
        return;
      }
      setModeId(next);
    },
    [modeId, requiresConfirm, setModeId],
  );

  return (
    <div className="flex shrink-0 flex-wrap items-end justify-center gap-x-8 gap-y-4 px-7 py-4">
      <Field label="mode">
        <ModePicker modeId={modeId} onPick={onPickMode} disabled={!allowSwitch} />
      </Field>
      <Field label="action">
        <ActionButton
          phase={state.phase}
          isChallenge={isChallenge ?? false}
          onEnter={enterQueue}
          onStart={startCountdown}
          onRestart={restart}
          onAbandon={abandon}
        />
      </Field>
      {/* Challenge create is only meaningful for server-shared races.
       *  Burst is a local-only mode (each client runs its own reducer)
       *  so a sharable lobby URL would mislead the joiner into a
       *  brand-new local lobby — hide the affordance entirely. */}
      {state.phase === "queue" && RACE_MODES[modeId].kind !== "burst" ? (
        <Field label="challenge">
          <CreateChallengeButton modeId={modeId} />
        </Field>
      ) : null}

      <ConfirmDialog
        open={pendingMode != null}
        onOpenChange={(next) => {
          if (!next) setPendingMode(null);
        }}
        title="Switch race mode?"
        confirmLabel="Switch mode"
        cancelLabel="Stay"
        confirmVariant="destructive"
        onConfirm={() => {
          if (pendingMode) setModeId(pendingMode);
          setPendingMode(null);
        }}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          You&apos;re already in a race. Switching modes will drop you
          out of the current lobby and start a fresh queue.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/** Create-a-private-lobby button. Lives in the top action strip
 *  next to Find race so both paths sit at the same hierarchy: one
 *  for matchmaking against bots / strangers, one for inviting a
 *  specific friend by URL. Only shown in queue phase — once the
 *  user is in a room, this affordance has nothing to do. */
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
        modeId: res.modeId as Parameters<typeof writeHostStorage>[1]["modeId"],
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
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
        "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? "Creating…" : "Create lobby"}
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
 *  geometry (h-8, rounded-md, uppercase tracking) so they
 *  line up against the mode chip across phases:
 *
 *    queue / finished → filled primary CTA (the move that opens up
 *                       the loop: Find race, Race again)
 *    racing           → hairline ghost (Abandon — recoverable, soft)
 *    matching / lobby /
 *    countdown        → disabled ghost (system is doing the work) */
function ActionButton({
  phase,
  isChallenge,
  onEnter,
  onStart,
  onRestart,
  onAbandon,
}: {
  phase: string;
  /** True when the user is in a `/race/c/<slug>` challenge lobby. In
   *  challenge mode the lobby phase exposes a clickable "Start race"
   *  primary CTA (host-controlled), instead of the auto-progressing
   *  matchmaking flow's disabled "Starting" pip. */
  isChallenge: boolean;
  onEnter: () => void;
  onStart: () => void;
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
    if (isChallenge) {
      return <PrimaryButton onClick={onStart}>Start race</PrimaryButton>;
    }
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
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
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
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
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
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70",
      )}
    >
      {children}
    </span>
  );
}
