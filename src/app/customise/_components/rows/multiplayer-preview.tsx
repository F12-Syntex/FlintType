"use client";

import { Passage } from "@/app/_components/passage";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { PreviewPracticeProvider } from "../preview-practice";

/* ─── Multiplayer ──────────────────────────────────────────────── */

/** Multiplayer preview. Mounts the real `<Passage>` inside
 *  `<PreviewPracticeProvider>` and passes the same `wordBackground` /
 *  `wordTextColor` overrides the race screen uses, so the in-passage
 *  marker mode renders 1:1 from the same code path. Static "opponent"
 *  positions are seeded relative to the preview cursor so each marker
 *  mode (Off / Highlight / Text colour) shows a clear visual delta:
 *    - Off       — passage reads exactly like single-player
 *    - Highlight — soft tint band on words behind the slowest opponent
 *    - Text      — upcoming letters paint in the slowest opponent's colour */
const MULTIPLAYER_PREVIEW_WORDS = [
  "ride",
  "the",
  "tide",
  "as",
  "racers",
  "stack",
  "up",
  "behind",
  "you",
  "and",
  "stretch",
  "out",
  "ahead",
];
type MockOpponent = { id: string; color: string; reachedWord: number };
// Slowest first — matches the slowest-first sort in RacePassage so
// the rendered tide reads identically. With the preview cursor at
// word 4, kassia sits one word behind, selan two ahead, damiel five
// ahead — every marker mode has a visible read. Colours kept in
// sync with `playerColorFor` so the preview matches the race.
const MOCK_OPPONENTS: readonly MockOpponent[] = [
  { id: "kassia", color: "oklch(0.68 0.20 305)", reachedWord: 3 },
  { id: "selan", color: "oklch(0.70 0.13 195)", reachedWord: 6 },
  { id: "damiel", color: "oklch(0.65 0.18 250)", reachedWord: 9 },
];
const MOCK_USER_CURSOR = 4;

export function MultiplayerPreview() {
  const { prefs } = useAppearancePrefs();
  const showColors = prefs.multiplayerPlayerColors;
  const marker = prefs.multiplayerOpponentMarker;

  function opponentForWord(wi: number): MockOpponent | null {
    if (!showColors || marker === "off") return null;
    for (const op of MOCK_OPPONENTS) {
      if (op.reachedWord >= wi) return op;
    }
    return null;
  }
  const wordBackground =
    marker === "tint"
      ? (wi: number) => {
          const op = opponentForWord(wi);
          return op
            ? `color-mix(in oklch, ${op.color} 22%, transparent)`
            : undefined;
        }
      : undefined;
  const wordTextColor =
    marker === "text"
      ? (wi: number) => opponentForWord(wi)?.color
      : undefined;

  return (
    <PreviewPracticeProvider
      words={MULTIPLAYER_PREVIEW_WORDS}
      finishedWords={MOCK_USER_CURSOR}
      cursorChar={1}
      errorWord={undefined}
    >
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6">
        <div className="relative h-[160px] w-full">
          <Passage
            wordBackground={wordBackground}
            wordTextColor={wordTextColor}
          />
        </div>
        {showColors ? (
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground">
            <LegendDot label="@you" color="var(--primary)" />
            {MOCK_OPPONENTS.map((op) => (
              <LegendDot key={op.id} label={`@${op.id}`} color={op.color} />
            ))}
          </div>
        ) : (
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            Turn on player colours to see other racers inside the text.
          </p>
        )}
      </div>
    </PreviewPracticeProvider>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </span>
  );
}
