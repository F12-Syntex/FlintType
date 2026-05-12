"use client";

import { useUser } from "@clerk/nextjs";
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

/** Pull a short, race-feed-friendly handle from the Clerk session.
 *  Mirrors the `firstName ?? username ?? email-localpart ?? "you"`
 *  fallback chain used in the topbar so the racer reads as the same
 *  identity. Always prefixed with `@` so feed entries (`@saif took
 *  the lead`) and lane labels keep the chat-handle shape that the
 *  bot names already use. */
function useYouHandle(): string {
  const { user, isSignedIn } = useUser();
  if (!isSignedIn || !user) return "@you";
  const raw =
    user.firstName ??
    user.username ??
    user.emailAddresses[0]?.emailAddress.split("@")[0] ??
    "you";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

/** Race shell. Owns the mode + seed + queue-flow pair that pins
 *  both the practice passage (via PracticeProvider's `lockedWords`)
 *  and the race state's bot lineup.
 *
 *  Three reset paths bubble up from the race UI:
 *    - `setModeId(next)` — mode chip → fresh queue with new mode
 *    - `restart()`       — race-again → new passage, skip queue
 *    - `rematch()`       — find new opponents → fresh queue, same mode
 *
 *  Each path bumps `seedKey`, which re-keys the whole practice + race
 *  subtree so state resets in lockstep. `withQueue` tells RaceProvider
 *  whether to drop into queue (bots not yet joined) or straight into
 *  lobby (race-again — bots stay at the table).
 *
 *  Architecture, top-down:
 *    RaceShell        ← config: { modeId, seed, withQueue }
 *      PracticeProvider lockedWords={raceWords}
 *        InputCapture
 *          RaceProvider  (drives bot tick + phase machine)
 *            children   (race UI) */
export function RaceShell({ children }: { children: ReactNode }) {
  const [modeId, setModeId] = useState<RaceModeId>("1v3");
  // Seed starts deterministic so SSR + client hydration agree on the
  // passage. The mount effect swaps it for a wall-clock seed so the
  // first race the user sees is genuinely random.
  const [seed, setSeed] = useState<number>(1);
  const [withQueue, setWithQueue] = useState<boolean>(true);
  useEffect(() => {
    setSeed(Date.now() | 0);
  }, []);

  const switchMode = useCallback((next: RaceModeId) => {
    setModeId(next);
    setSeed(Date.now() | 0);
    setWithQueue(true);
  }, []);
  const restartShell = useCallback(() => {
    setSeed(Date.now() | 0);
    setWithQueue(false);
  }, []);
  const enterQueueShell = useCallback(() => {
    setSeed(Date.now() | 0);
    setWithQueue(true);
  }, []);

  const words = useMemo(
    () => generateRacePassage(RACE_MODES[modeId].wordCount, seed),
    [modeId, seed],
  );

  const youName = useYouHandle();
  // Re-key on the user handle too so a session change (sign-in /
  // sign-out mid-session) cleanly rebuilds the racer roster instead
  // of leaving a stale name baked into the reducer's initial state.
  const subtreeKey = `${modeId}:${seed}:${withQueue ? "q" : "l"}:${youName}`;

  return (
    <PracticeProvider key={subtreeKey} lockedWords={words}>
      <InputCapture>
        <RaceProvider
          key={subtreeKey}
          modeId={modeId}
          raceSeed={seed}
          withQueue={withQueue}
          youName={youName}
          setModeId={switchMode}
          restartShell={restartShell}
          enterQueueShell={enterQueueShell}
        >
          {children}
        </RaceProvider>
      </InputCapture>
    </PracticeProvider>
  );
}
