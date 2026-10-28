"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import { QuoteAttribution } from "./quote-attribution";
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
 *  We render the passage as plain prose (the app font, same as the
 *  live passage, so the screen never switches typeface) with three glyph
 *  states (typed / cursor / upcoming) rather than reusing
 *  PracticeProvider's `<Passage>` — the practice component is tightly
 *  bound to the local typer's state and bringing it into spectator
 *  mode would require threading an alternate state source through
 *  the whole component. Plain renderer is simpler and renders fast
 *  enough at 25-word passages. */
export function SpectatorPassage({
  words,
  racers,
  source,
}: {
  words: readonly string[];
  racers: readonly Racer[];
  /** Quote author, credited directly under the text. */
  source?: string;
}) {
  const unfinished = useMemo(
    () =>
      racers
        .filter((r) => !r.isYou && r.finishedAt == null && !r.disconnected)
        .sort((a, b) => b.correctChars - a.correctChars),
    [racers],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Same colour rule as the lineup lanes: an opponent wears their
  // palette colour only with the player-colours setting on, otherwise
  // ink, so the cursor here always matches their marker up top.
  const { prefs } = useAppearancePrefs();
  const accentFor = (id: string) =>
    prefs.multiplayerPlayerColors ? playerColorFor(id) : "var(--foreground)";

  // The watched racer: the user's pick while they're still racing,
  // otherwise the leader among still-racing opponents. Derived (not
  // synced in an effect), so when the watched racer finishes or drops
  // the view moves on in the same render and never goes dead.
  const selected =
    unfinished.find((r) => r.id === selectedId) ?? unfinished[0] ?? null;

  if (unfinished.length === 0 || !selected) {
    // Should not happen during state.phase === "racing", but a brief
    // race condition (server emits "all finished" before the client's
    // local "you finished" recalculates) could land us here. Empty
    // panel + caption.
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Everyone finished.</span>
      </div>
    );
  }

  const cursor = Math.max(0, Math.min(selected.correctChars, totalChars(words)));
  const color = accentFor(selected.id);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <SpectatorHeader
        watched={selected}
        unfinished={unfinished}
        onPick={setSelectedId}
        totalChars={totalChars(words)}
        accentFor={accentFor}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
        <p
          aria-label={`Watching ${selected.name}, cursor at character ${cursor}`}
          className="whitespace-pre-wrap break-words text-xl leading-[1.7] sm:text-2xl"
        >
          {renderPassage(words, cursor, color)}
        </p>
        {source ? <QuoteAttribution source={source} /> : null}
      </div>
    </div>
  );
}

function SpectatorHeader({
  watched,
  unfinished,
  onPick,
  totalChars,
  accentFor,
}: {
  watched: Racer;
  unfinished: readonly Racer[];
  onPick: (id: string) => void;
  totalChars: number;
  accentFor: (id: string) => string;
}) {
  const pct = totalChars > 0 ? Math.round((watched.correctChars / totalChars) * 100) : 0;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-3">
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        Watching
      </span>
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
        <span className="text-sm font-semibold text-foreground">{watched.name}</span>
        <span>
          <span className="font-semibold text-foreground">{pct}%</span> done
        </span>
        <span>
          <span className="font-semibold text-foreground">{watched.wpm}</span> wpm
        </span>
      </span>
      {/* The picker only earns its place with a real choice: with one
       *  racer left there's nothing to switch to. */}
      {unfinished.length > 1 ? (
        <div
          role="group"
          aria-label="Racer to watch"
          className="ml-auto flex flex-wrap items-center gap-1.5"
        >
          {unfinished.map((r) => {
            const active = r.id === watched.id;
            return (
              <Button
                key={r.id}
                variant="outline"
                size="xs"
                onClick={() => onPick(r.id)}
                aria-pressed={active}
                className={cn(
                  "h-11 gap-1.5 sm:h-7",
                  active &&
                    "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                )}
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accentFor(r.id) }}
                />
                {r.name}
              </Button>
            );
          })}
        </div>
      ) : null}
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
        className="rounded-sm"
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
