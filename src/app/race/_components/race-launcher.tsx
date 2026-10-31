"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CreateChallengePanel } from "./challenge-config";
import { useQueueStatus } from "./queue-status";
import { RACE_MODES, RACE_MODE_ORDER, type RaceModeId } from "./race-data";
import { useRace } from "./race-state";
import { useLobbyConfig } from "./use-lobby-config";

const MODE_OPTIONS = RACE_MODE_ORDER.map((id) => ({
  value: id,
  label: RACE_MODES[id].name,
}));

/** The idle /race screen: one centred launcher that answers "how do I
 *  start a race?" in a glance.
 *
 *    1. the page h1,
 *    2. the mode as the shared segmented switch (orange selected pill),
 *       with one short line describing it,
 *    3. "Find race" (the one filled primary, public matchmaking), then
 *       "Create private lobby" (outline) and its settings gear. The gear
 *       opens the lobby settings under the row (see
 *       `CreateChallengePanel`).
 *
 *  Stacked full-width at phone sizes (max-w-xs), one row from sm. Any
 *  failure (finding a race, creating a lobby) shows as a single
 *  destructive line under the buttons (ui-law §6.3), in a slot that's
 *  always reserved so the centred block never jumps when it appears. */
export function RaceLauncher() {
  const { modeId, setModeId, enterQueue, onlineRoomId } = useRace();
  const queue = useQueueStatus();
  const [createError, setCreateError] = useState<string | null>(null);
  const [lobbyConfig, setLobbyConfig] = useLobbyConfig();
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
      <div className="flex w-full max-w-xs flex-col items-center gap-4 sm:max-w-md">
        <h1
          id="race-launcher-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Race
        </h1>
        <SegmentedControl<RaceModeId>
          ariaLabel="Race mode"
          value={modeId}
          onValueChange={(id) => {
            setCreateError(null);
            setModeId(id);
          }}
          options={MODE_OPTIONS}
          className="flex w-full flex-nowrap sm:inline-flex sm:w-auto [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:h-auto sm:[&>button]:flex-none sm:[&>button]:px-5"
        />
        <p className="text-sm text-muted-foreground">{mode.description}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-3 sm:max-w-none">
        <CreateChallengePanel
          lead={
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
          }
          modeId={modeId}
          config={lobbyConfig}
          setConfig={setLobbyConfig}
          onError={setCreateError}
        />
        <p role="alert" className="min-h-5 text-sm text-destructive">
          {error ?? ""}
        </p>
      </div>
    </section>
  );
}
