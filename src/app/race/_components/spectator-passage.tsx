"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { playerColorFor } from "./race-data";
import type { Racer } from "./race-types";

/** Spectator passage — what the typing area swaps to when YOU finish
 *  the race but the room is still going. Lets you watch another
 *  racer's cursor advance through the same passage in real time
 *  (re-rendered on every server snapshot, ~10 Hz).
 *
 *  Picker chips list every unfinished racer; the leader (most
 *  progress) is selected on mount. If the watched racer finishes
 *  before the room does, we re-pick the next-leading unfinished
 *  racer automatically so the view never goes dead.
 *
 *  We render the passage as plain monospaced prose with three glyph
 *  states (typed / cursor / upcoming) rather than reusing
 *  PracticeProvider's `<Passage>` — the practice component is tightly
 *  bound to the local typer's state and bringing it into spectator
 *  mode would require threading an alternate state source through
 *  the whole component. Plain renderer is simpler and renders fast
 *  enough at 25-word passages. */
export function SpectatorPassage({
  words,
  racers,
}: {
  words: readonly string[];
  racers: readonly Racer[];
}) {
  const unfinished = useMemo(
    () =>
      racers
        .filter((r) => !r.isYou && r.finishedAt == null && !r.disconnected)
        .sort((a, b) => b.correctChars - a.correctChars),
    [racers],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default selection / re-selection when the watched racer drops
  // off (finishes or disconnects). Always tracks the leader among
  // still-racing opponents.
  useEffect(() => {
    if (unfinished.length === 0) return;
    if (!unfinished.some((r) => r.id === selectedId)) {
      setSelectedId(unfinished[0]!.id);
    }
  }, [unfinished, selectedId]);

  const selected = unfinished.find((r) => r.id === selectedId) ?? null;

  if (unfinished.length === 0 || !selected) {
    // Should not happen during state.phase === "racing", but a brief
    // race condition (server emits "all finished" before the client's
    // local "you finished" recalculates) could land us here. Empty
    // panel + caption.
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Everyone finished.
        </span>
      </div>
    );
  }

  const cursor = Math.max(0, Math.min(selected.correctChars, totalChars(words)));
  const color = playerColorFor(selected.id);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <SpectatorHeader
        watched={selected}
        unfinished={unfinished}
        onPick={setSelectedId}
        totalChars={totalChars(words)}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <p
          aria-label={`Watching ${selected.name} — cursor at character ${cursor}`}
          className="whitespace-pre-wrap break-words font-mono text-[20px] leading-[1.7] tracking-[-0.005em] sm:text-[24px]"
        >
          {renderPassage(words, cursor, color)}
        </p>
      </div>
    </div>
  );
}

function SpectatorHeader({
  watched,
  unfinished,
  onPick,
  totalChars,
}: {
  watched: Racer;
  unfinished: readonly Racer[];
  onPick: (id: string) => void;
  totalChars: number;
}) {
  const pct = totalChars > 0 ? Math.round((watched.correctChars / totalChars) * 100) : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
        Spectating
      </span>
      <span className="flex items-baseline gap-3 text-[11px] uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
        <span className="text-foreground">{watched.name}</span>
        <span>
          <span className="text-foreground">{pct}%</span> progress
        </span>
        <span>
          <span className="text-foreground">{watched.wpm}</span> wpm
        </span>
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {unfinished.map((r) => {
          const active = r.id === watched.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                active
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: playerColorFor(r.id) }}
              />
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Walk the passage char-by-char and assign one of three styles:
 *  past (typed, foreground), cursor (the watched racer's accent
 *  block), upcoming (muted). Spaces between words are included as
 *  their own positions so the cursor lines up exactly with the
 *  `progressChars` integer the server publishes. */
function renderPassage(
  words: readonly string[],
  cursor: number,
  cursorColor: string,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let idx = 0;
  for (let wi = 0; wi < words.length; wi += 1) {
    const w = words[wi]!;
    for (let ci = 0; ci < w.length; ci += 1) {
      out.push(
        <Glyph
          key={`${wi}-${ci}`}
          char={w[ci]!}
          state={
            idx < cursor ? "past" : idx === cursor ? "cursor" : "upcoming"
          }
          cursorColor={cursorColor}
        />,
      );
      idx += 1;
    }
    if (wi < words.length - 1) {
      out.push(
        <Glyph
          key={`s-${wi}`}
          char={" "}
          state={
            idx < cursor ? "past" : idx === cursor ? "cursor" : "upcoming"
          }
          cursorColor={cursorColor}
          isSpace
        />,
      );
      idx += 1;
    }
  }
  return out;
}

function Glyph({
  char,
  state,
  cursorColor,
  isSpace,
}: {
  char: string;
  state: "past" | "cursor" | "upcoming";
  cursorColor: string;
  isSpace?: boolean;
}) {
  if (state === "cursor") {
    return (
      <span
        className="rounded-[2px]"
        style={{
          backgroundColor: `color-mix(in oklch, ${cursorColor} 35%, transparent)`,
          color: "var(--foreground)",
          // Spaces have no visible glyph — give them a min-width so
          // the cursor highlight still shows as a coloured rectangle.
          ...(isSpace ? { padding: "0 0.18em" } : {}),
        }}
      >
        {char}
      </span>
    );
  }
  if (state === "past") {
    return <span className="text-foreground">{char}</span>;
  }
  return <span className="text-muted-foreground/50">{char}</span>;
}

function totalChars(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let n = words.length - 1;
  for (const w of words) n += w.length;
  return n;
}
