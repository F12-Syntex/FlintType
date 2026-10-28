"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CreateChallengePanel } from "./challenge-config";
import { useQueueStatus } from "./queue-status";
import { RACE_MODES, RACE_MODE_ORDER, type RaceModeId } from "./race-data";
import { useRace } from "./race-state";

const MODE_OPTIONS = RACE_MODE_ORDER.map((id) => ({
  value: id,
  label: RACE_MODES[id].name,
}));

/** The idle /race screen: one centred launcher that answers "how do I
 *  start a race?" in a glance.
 *
 *    1. the page h1 + one line of what racing is,
 *    2. the mode as the shared segmented switch (orange selected pill),
 *    3. a one-sentence description of the picked mode,
 *    4. "Find race" — the one filled primary (public matchmaking),
 *    5. "Create private lobby" (outline) + its settings gear.
 *
 *  Stacked full-width at phone sizes (max-w-xs), one row from sm. Any
 *  failure (finding a race, creating a lobby) shows as a single
 *  destructive line under the buttons (ui-law §6.3). */
export function RaceLauncher() {
  const { modeId, setModeId, enterQueue, onlineRoomId } = useRace();
  const queue = useQueueStatus();
  const [createError, setCreateError] = useState<string | null>(null);
  // The request is in flight, or it landed and we're waiting on the
  // room's first snapshot — either way the race is being found.
  const finding = queue.pending || onlineRoomId != null;
  // Whichever action ran last wins: a create error is cleared when Find
  // race is pressed, and a fresh create error outranks an older queue one.
  const error = createError ?? queue.error;
  const mode = RACE_MODES[modeId];

  return (
    <section
      aria-labelledby="race-launcher-title"
      className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center sm:py-16"
    >
      <div className="flex max-w-md flex-col items-center gap-2">
        <h1
          id="race-launcher-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Race
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Type the same passage as everyone else. First to the line wins.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-md">
        <SegmentedControl<RaceModeId>
          ariaLabel="Race mode"
          value={modeId}
          onValueChange={(id) => {
            setCreateError(null);
            setModeId(id);
          }}
          options={MODE_OPTIONS}
          className="flex w-full flex-nowrap sm:inline-flex sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none sm:[&>button]:px-5"
        />
        <p className="min-h-10 text-sm leading-relaxed text-muted-foreground">
          {mode.description}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-none">
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button
            size="lg"
            onClick={() => {
              setCreateError(null);
              void enterQueue();
            }}
            disabled={finding}
            className="w-full px-8 sm:w-auto"
          >
            {finding ? "Finding race…" : "Find race"}
          </Button>
          <CreateChallengePanel modeId={modeId} onError={setCreateError} />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
