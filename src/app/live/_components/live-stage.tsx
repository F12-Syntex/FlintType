"use client";

import { practiceProgressChars } from "@/app/_components/practice-progress";
import { revealAt } from "@/lib/reveal-passage";
import type { LiveScreen } from "@/types/live";
import { LiveClone } from "./live-clone";
import { useSmoothChars } from "./use-smooth-chars";

/** Smooths the spectated screen. Server snapshots arrive ~1s apart; this
 *  eases a play-head through the passage toward the latest one so the
 *  caret advances character by character (smooth typing) instead of
 *  jumping. On a finished run it lets the typing finish gliding, THEN
 *  shows the results — so you watch them complete it, then see the
 *  report. Everything renders through the real `<LiveClone>`. */
export function LiveStage({
  words,
  screen,
  wpm,
  accuracy,
}: {
  words: string[];
  screen: LiveScreen;
  wpm: number;
  accuracy: number;
}) {
  const total = words.join(" ").length;
  const liveCaret = practiceProgressChars({
    words,
    cursorWord: screen.cursorWord,
    cursorChar: screen.cursorChar,
  });
  const done = screen.phase === "done";
  const target = done ? total : liveCaret;
  const shown = useSmoothChars(target);
  const caughtUp = shown >= target - 1;

  // Finished AND the play-head has caught up → show the real results.
  if (done && caughtUp) {
    return (
      <LiveClone words={words} screen={screen} wpm={wpm} accuracy={accuracy} />
    );
  }

  // Otherwise render the passage at the eased play-head position.
  const r = revealAt(words, screen.typed, shown);
  const running: LiveScreen = {
    ...screen,
    phase: "running",
    cursorWord: r.cursorWord,
    cursorChar: r.cursorChar,
    typed: r.typed,
  };
  return (
    <LiveClone words={words} screen={running} wpm={wpm} accuracy={accuracy} />
  );
}
