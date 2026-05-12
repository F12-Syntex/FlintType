"use client";

import { cn } from "@/lib/utils";
import { useRace } from "./race-state";
import { wordIdxFromChars } from "./race-reducer";

/** Right-rail sidebar. Three sections, all live:
 *    RACE FEED   — milestones, leader changes, finishes (state.feed)
 *    YOUR RUN    — your current placement, wpm, accuracy, completion
 *    RACE MODES  — visual chip stack; 1V3 is the only wired mode for
 *                  now, the rest sit dim with "soon" so the user sees
 *                  the roadmap but can't break anything by clicking. */
export function RaceSidebar() {
  const { state, yourWpm, yourAccuracy, elapsedSeconds } = useRace();
  const racers = [...state.racers].sort(
    (a, b) => b.correctChars - a.correctChars,
  );
  const you = state.racers.find((r) => r.isYou)!;
  const yourLivePlace =
    you.place ?? racers.findIndex((r) => r.id === "you") + 1;
  const wordsTotal = state.words.length;
  const pct =
    state.totalChars === 0 ? 0 : Math.round((you.correctChars / state.totalChars) * 100);

  return (
    <aside className="flex flex-col border-t border-ft-ink-line lg:border-t-0 lg:border-l">
      <Section title="RACE FEED" rightHint={state.phase === "racing" ? "LIVE" : ""}>
        <div className="flex flex-col gap-2.5">
          {state.feed.length === 0 ? (
            <span className="text-[10px] text-ft-warm-3">
              Race events appear here once GO fires.
            </span>
          ) : null}
          {state.feed.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_1fr] items-baseline gap-2"
            >
              <span className="text-[10px] tabular-nums text-ft-warm-3">
                {formatT(e.t)}
              </span>
              <div className="text-[11px] leading-snug">
                <span
                  className={cn(
                    "font-semibold",
                    e.accent ? "text-ft-ember" : "text-ft-warm-1",
                  )}
                >
                  {e.who}
                </span>{" "}
                <span className="text-ft-warm-1">{e.text}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="YOUR RUN">
        <div className="flex flex-col gap-2.5 text-[11px]">
          <Row
            label="placement"
            value={`#${yourLivePlace} of ${state.racers.length}`}
            accent={yourLivePlace === 1}
          />
          <Row
            label="wpm"
            value={String(yourWpm)}
            accent
          />
          <Row label="accuracy" value={`${yourAccuracy.toFixed(1)}%`} />
          <Row
            label="words done"
            value={`${wordsDoneCount(you.correctChars, state.totalChars, state.charsBeforeWord, wordsTotal)}/${wordsTotal}`}
          />
          <Row label="progress" value={`${pct}%`} />
          <Row label="elapsed" value={formatT(elapsedSeconds)} />
        </div>
      </Section>

      <Section title="RACE MODES">
        <div className="flex flex-col gap-2">
          <ModeChip name="1V3" detail="4 racers · 50 words" active />
          <ModeChip name="1V1" detail="head-to-head — soon" />
          <ModeChip name="BURST" detail="one word, ten times — soon" />
          <ModeChip name="SPRINT" detail="15-second blitz — soon" />
          <ModeChip name="ENDURANCE" detail="500 words — soon" />
        </div>
      </Section>
    </aside>
  );
}

function Section({
  title,
  rightHint,
  children,
}: {
  title: string;
  rightHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ft-ink-line px-6 py-5">
      <div className="mb-3.5 flex justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ft-paper">
          {title}
        </span>
        {rightHint ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-ft-warm-3">
            {rightHint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-ft-warm-2">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          accent ? "text-ft-ember" : "text-ft-paper",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ModeChip({
  name,
  detail,
  active = false,
}: {
  name: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 border px-2 py-1.5",
        active
          ? "border-ft-ember bg-ft-ember/[0.08]"
          : "border-ft-ink-line opacity-70",
      )}
    >
      <div>
        <div
          className={cn(
            "text-[11px] font-semibold",
            active ? "text-ft-ember" : "text-ft-paper",
          )}
        >
          {name}
        </div>
        <div className="mt-0.5 text-[10px] text-ft-warm-2">{detail}</div>
      </div>
    </div>
  );
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Words the racer has completed. Reuses the same wordIdx mapping
 *  the reducer uses, plus handles the "finished the whole passage"
 *  edge case — the last word doesn't carry a trailing space, so a
 *  pure wordIdx lookup tops out one short of words.length. */
function wordsDoneCount(
  correctChars: number,
  totalChars: number,
  charsBefore: readonly number[],
  wordsTotal: number,
): number {
  if (totalChars > 0 && correctChars >= totalChars) return wordsTotal;
  return wordIdxFromChars(charsBefore, correctChars);
}
