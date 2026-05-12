"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { InputCapture } from "../../_components/input-capture";
import { PracticeProvider } from "../../_components/practice-state";
import { generateRacePassage, RACE_MODES, type RaceModeId } from "./race-data";
import { RaceProvider } from "./race-state";

/** Race shell. Owns the mode + seed pair that pins both the practice
 *  passage (via PracticeProvider's `lockedWords`) and the race
 *  state's bot lineup. Bumping the seed re-keys the whole subtree
 *  so a "race again" / mode-switch resets practice and race state
 *  in lockstep — no partial mid-race ghosts.
 *
 *  Architecture, top-down:
 *    RaceShell        ← config: { modeId, seed }
 *      PracticeProvider lockedWords={raceWords}  (typing + caret + smooth scroll come from here)
 *        InputCapture  (the hidden input that drives mobile + desktop typing alike)
 *          RaceProvider  (reads PracticeContext for the human, runs bot tick + phase machine)
 *            children   (race UI: lanes, passage, sidebar, results) */
export function RaceShell({ children }: { children: ReactNode }) {
  const [modeId, setModeId] = useState<RaceModeId>("1v3");
  // Seed starts deterministic so SSR + client hydration agree on the
  // passage. The mount effect below swaps it for a wall-clock seed
  // so the first race the user sees is genuinely random.
  const [seed, setSeed] = useState<number>(1);
  useEffect(() => {
    setSeed(Date.now() | 0);
  }, []);

  const restartShell = useCallback(() => setSeed(Date.now() | 0), []);
  const switchMode = useCallback((next: RaceModeId) => {
    setModeId(next);
    setSeed(Date.now() | 0);
  }, []);

  const words = useMemo(
    () => generateRacePassage(RACE_MODES[modeId].wordCount, seed),
    [modeId, seed],
  );

  // The shell's `key` rebuilds the entire practice + race subtree on
  // every reset. Cheaper than threading a "reset" action through both
  // providers because PracticeProvider's reducer init reads lockedWords
  // once at mount and never re-syncs.
  const subtreeKey = `${modeId}:${seed}`;

  return (
    <PracticeProvider key={subtreeKey} lockedWords={words}>
      <InputCapture>
        <RaceProvider
          key={subtreeKey}
          modeId={modeId}
          raceSeed={seed}
          setModeId={switchMode}
          restartShell={restartShell}
        >
          {children}
        </RaceProvider>
      </InputCapture>
    </PracticeProvider>
  );
}
