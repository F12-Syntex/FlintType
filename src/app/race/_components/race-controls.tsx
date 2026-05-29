"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreateChallengePanel } from "./challenge-config";
import { ModePicker } from "./mode-picker";
import { useRace } from "./race-state";

/** Top race strip, sibling of practice's `<ModeBar>`. Phase-aware:
 *
 *    queue   → the setup strip: pick a mode, "Find race" (public
 *              matchmaking), or "Create lobby" (private, with its
 *              settings gear). Same centred `<Field>` lockup the
 *              practice ModeBar uses.
 *    in a room (matching / lobby / countdown / racing) → the mode /
 *              action / host chips are gone (nothing to pick once
 *              you're in a lobby). A single "Leave race" button is
 *              both the exit and the back button.
 *    finished → nothing; the results panel owns Leave + Race again. */
export function RaceControls() {
  const { state, modeId, setModeId, enterQueue, abandon } = useRace();
  const router = useRouter();
  const phase = state.phase;

  // In a room: a single "Leave race" affordance that drops you from the
  // room and returns to /race. The leave-guard whitelists /race
  // navigation, so this never fires the confirm dialog on top.
  if (phase !== "queue" && phase !== "finished") {
    return (
      <div className="flex shrink-0 items-center px-7 py-4">
        <GhostButton
          onClick={() => {
            abandon();
            router.push("/race");
          }}
        >
          Leave race
        </GhostButton>
      </div>
    );
  }

  // Race over: RaceResults owns the Leave + Race again CTAs.
  if (phase === "finished") return null;

  // Queue surface: pick a mode, find a public race, or create a lobby.
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-center gap-x-8 gap-y-4 px-7 py-4">
      <Field label="mode">
        <ModePicker modeId={modeId} onPick={setModeId} disabled={false} />
      </Field>
      <Field label="action">
        <PrimaryButton onClick={enterQueue}>Find race</PrimaryButton>
      </Field>
      <Field label="lobby">
        <CreateChallengePanel modeId={modeId} />
      </Field>
    </div>
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
