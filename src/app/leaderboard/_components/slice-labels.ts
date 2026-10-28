import {
  type LeaderboardPreset,
  type LeaderboardScope,
  type LeaderboardWindow,
  lengthModeForPreset,
  type RunLengthMode,
} from "@/types/leaderboard";
import {
  ALL_LENGTHS_LABEL,
  type LeaderboardFilters,
  presetLabel,
  SCOPES,
  WINDOWS,
} from "./filters";

/** Plain-language labels for a leaderboard slice and its runs: the
 *  empty-state sentence, the mobile filter summary, a run's length and
 *  the other mode to offer when a board is empty. Pure, so tested. */

const TIME_AMOUNTS = new Set([15, 30, 60, 120]);

/** Label for a run's length, e.g. "60s" or "25 words". A pinned board
 *  knows the unit from its preset. On "All lengths" the unit is guessed
 *  from the number (the stock time amounts are 15/30/60/120), so a
 *  custom 30-word run can read as "30s" until entries carry their
 *  length mode. */
export function runLengthLabel(
  amount: number,
  preset: LeaderboardPreset,
  rowMode: RunLengthMode | null = null,
): string {
  // The row's own unit wins; then the board's; legacy rows on "All
  // lengths" fall back to guessing from the amount.
  const mode = rowMode ?? lengthModeForPreset(preset);
  const isTime = mode ? mode === "time" : TIME_AMOUNTS.has(amount);
  return isTime ? `${amount}s` : `${amount} ${amount === 1 ? "word" : "words"}`;
}

/** Inverse of a scope, offered when the widest board of one mode is
 *  empty ("Show Adapt runs"). */
export function otherScope(scope: LeaderboardScope): {
  id: LeaderboardScope;
  label: string;
} {
  const id: LeaderboardScope = scope === "training" ? "casual" : "training";
  return { id, label: SCOPES.find((s) => s.id === id)?.label ?? "Casual" };
}

const WINDOW_PHRASE: Record<LeaderboardWindow, string> = {
  all_time: "",
  month: " this month",
  week: " this week",
  day: " today",
};

/** Plain-language name of a slice for the empty state, e.g.
 *  "casual runs at 60 seconds this week from friends". */
export function describeSlice(f: LeaderboardFilters): string {
  const mode = (SCOPES.find((s) => s.id === f.scope)?.label ?? "Casual")
    .toLowerCase();
  const length = f.preset === "any" ? "" : ` at ${presetLabel(f.preset)}`;
  const who = f.audience === "friends" ? " from friends" : "";
  return `${mode} runs${length}${WINDOW_PHRASE[f.window]}${who}`;
}

/** One-line summary for the mobile filter button, e.g.
 *  "Casual · 60s · All time" (prefixed with "Friends" when set). */
export function filterSummary(f: LeaderboardFilters): string {
  const parts = [
    SCOPES.find((s) => s.id === f.scope)?.label ?? "Casual",
    f.preset === "any"
      ? ALL_LENGTHS_LABEL
      : f.preset.startsWith("t")
        ? `${f.preset.slice(1)}s`
        : presetLabel(f.preset),
    WINDOWS.find((w) => w.id === f.window)?.label ?? "All time",
  ];
  if (f.audience === "friends") parts.unshift("Friends");
  return parts.join(" · ");
}
