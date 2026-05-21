"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ghostCumulativeChars } from "./typing-ghost";

export type TypingResult = {
  wpm: number;
  accuracy: number;
  /** Per-second WPM samples, for replaying this run as a ghost later. */
  wpmHistory: number[];
};

export type TypingProgress = {
  progressChars: number;
  totalChars: number;
  wpm: number;
  accuracy: number;
};

/** A focused, self-contained typing surface — deliberately decoupled
 *  from the adaptive practice engine. Renders the passage, captures
 *  keystrokes through a hidden input (so mobile keyboards work), tracks
 *  gross WPM + accuracy, samples WPM each second, and — when a `ghost`
 *  trace is supplied — paces a marker down the progress bar at a
 *  recorded speed. Reused by duels (race a ghost) and live broadcast
 *  (stream `onProgress`). Calls `onFinish` once the passage is fully
 *  typed. */
export function TypingSurface({
  words,
  ghost = null,
  onFinish,
  onProgress,
}: {
  words: string[];
  ghost?: number[] | null;
  onFinish: (result: TypingResult) => void;
  /** Fires on every tick (~200ms) with the live cursor + speed, so a
   *  broadcast surface can stream it. */
  onProgress?: (p: TypingProgress) => void;
}) {
  const target = useMemo(() => words.join(" "), [words]);
  const total = target.length;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const prevRef = useRef("");
  const startRef = useRef<number | null>(null);
  const correctRef = useRef(0);
  const keystrokesRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [done, setDone] = useState(false);

  // Cumulative ghost char position per whole second, precomputed from
  // the recorded cumulative-average WPM trace. See typing-ghost.ts —
  // the samples are NOT instantaneous rates, so this is a direct map,
  // not an integration.
  const ghostCumChars = useMemo(
    () => (ghost && ghost.length > 0 ? ghostCumulativeChars(ghost) : null),
    [ghost],
  );

  const correctChars = correctRef.current;
  const elapsedMin = Math.max(elapsedMs / 60_000, 1 / 60_000);
  const liveWpm = Math.round(correctChars / 5 / elapsedMin);
  const liveAcc =
    keystrokesRef.current > 0
      ? Math.round((correctChars / keystrokesRef.current) * 1000) / 10
      : 100;

  const finish = useCallback(() => {
    if (done) return;
    setDone(true);
    const mins = Math.max((Date.now() - (startRef.current ?? Date.now())) / 60_000, 1 / 60_000);
    const wpm = Math.round(correctRef.current / 5 / mins);
    const acc =
      keystrokesRef.current > 0
        ? Math.round((correctRef.current / keystrokesRef.current) * 1000) / 10
        : 100;
    onFinish({ wpm, accuracy: Math.max(0, Math.min(100, acc)), wpmHistory: samplesRef.current });
  }, [done, onFinish]);

  // Tick: drive elapsed time + per-second WPM sampling + ghost.
  useEffect(() => {
    if (startRef.current == null || done) return;
    const id = window.setInterval(() => {
      const ms = Date.now() - (startRef.current ?? Date.now());
      setElapsedMs(ms);
      const sec = Math.floor(ms / 1000);
      while (samplesRef.current.length < sec) {
        const mins = Math.max((samplesRef.current.length + 1) / 60, 1 / 60_000);
        samplesRef.current.push(Math.round(correctRef.current / 5 / mins));
      }
      if (onProgressRef.current) {
        const mins = Math.max(ms / 60_000, 1 / 60_000);
        const wpm = Math.round(correctRef.current / 5 / mins);
        const acc =
          keystrokesRef.current > 0
            ? Math.round((correctRef.current / keystrokesRef.current) * 1000) / 10
            : 100;
        onProgressRef.current({
          progressChars: prevRef.current.length,
          totalChars: total,
          wpm,
          accuracy: Math.max(0, Math.min(100, acc)),
        });
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [done, typed, total]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (done) return;
      let value = e.target.value;
      if (value.length > total) value = value.slice(0, total);
      const prev = prevRef.current;
      if (value.length > prev.length) {
        for (let i = prev.length; i < value.length; i++) {
          keystrokesRef.current += 1;
          if (value[i] === target[i]) correctRef.current += 1;
        }
        if (startRef.current == null) startRef.current = Date.now();
      }
      prevRef.current = value;
      setTyped(value);
      if (value.length >= total) finish();
    },
    [done, finish, target, total],
  );

  const playerFrac = total > 0 ? Math.min(1, typed.length / total) : 0;
  const ghostSec = Math.floor(elapsedMs / 1000);
  const ghostChars = ghostCumChars
    ? (ghostCumChars[Math.min(ghostSec, ghostCumChars.length - 1)] ?? 0)
    : 0;
  const ghostFrac = ghostCumChars ? Math.min(1, ghostChars / total) : null;

  return (
    <div
      className="flex flex-col gap-5"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      {/* Progress: player + (optional) ghost */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="tabular-nums">
            <span className="text-foreground">{liveWpm}</span> wpm ·{" "}
            <span className="text-foreground">
              {keystrokesRef.current > 0 ? liveAcc : "—"}
            </span>
            % acc
          </span>
          {ghostFrac != null ? <span>ghost</span> : null}
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
          {ghostFrac != null ? (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/50"
              style={{ width: `${ghostFrac * 100}%` }}
            />
          ) : null}
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${playerFrac * 100}%` }}
          />
        </div>
      </div>

      {/* Passage — painted in the native practice passage's visual
       *  language: the same `--ft-passage-*` colour tokens (so it
       *  follows the user's Appearance settings exactly like the main
       *  typing screen) and the same mono typography + line-height. */}
      <p className="font-mono text-2xl leading-[1.7] tracking-tight sm:text-[26px]">
        {target.split("").map((ch, i) => {
          const state =
            i < typed.length
              ? typed[i] === ch
                ? "correct"
                : "wrong"
              : i === typed.length
                ? "cursor"
                : "untyped";
          return (
            <span
              key={i}
              className={cn(
                state === "correct" &&
                  "text-[var(--ft-passage-typed,var(--primary))]",
                state === "wrong" &&
                  "font-bold text-[var(--ft-passage-error,var(--destructive))]",
                state === "cursor" &&
                  "rounded-[2px] text-[var(--ft-passage-untyped,var(--muted-foreground))] underline decoration-primary decoration-2 underline-offset-[6px]",
                state === "untyped" &&
                  "text-[var(--ft-passage-untyped,var(--muted-foreground))]",
                ch === " " && "px-px",
              )}
            >
              {ch}
            </span>
          );
        })}
      </p>

      {/* Hidden capture input — focused on mount; tap the passage to refocus. */}
      <input
        ref={inputRef}
        value={typed}
        onChange={onChange}
        disabled={done}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Type the passage"
        className="absolute h-px w-px opacity-0"
      />

      {!done ? (
        <p className="text-[11px] text-muted-foreground">
          Just start typing. Tap the passage if the keyboard doesn&apos;t open.
        </p>
      ) : null}
    </div>
  );
}
