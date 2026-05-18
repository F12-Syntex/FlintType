import type {
  LeaderboardPreset,
  LeaderboardScope,
  LeaderboardWindow,
} from "@/types/leaderboard";

export const SCOPES: readonly { id: LeaderboardScope; label: string }[] = [
  { id: "all", label: "All modes" },
  { id: "race", label: "Race" },
  { id: "training", label: "Training" },
  { id: "casual", label: "Casual" },
];

export const WINDOWS: readonly { id: LeaderboardWindow; label: string }[] = [
  { id: "all_time", label: "All time" },
  { id: "month", label: "This month" },
  { id: "week", label: "This week" },
  { id: "day", label: "Today" },
];

/** Preset slices — group time presets and word presets so the
 *  sidebar can render them under sub-headings. Word presets share
 *  the personal-bests scale (10/25/50/100); time presets share the
 *  same MonkeyType-style 15/30/60/120 scale. "any" is the default
 *  — no amount filter, full table. */
export const PRESET_GROUPS: readonly {
  title: string;
  options: readonly { id: LeaderboardPreset; label: string }[];
}[] = [
  {
    title: "Length",
    options: [{ id: "any", label: "All lengths" }],
  },
  {
    title: "Words",
    options: [
      { id: "w10", label: "10 words" },
      { id: "w25", label: "25 words" },
      { id: "w50", label: "50 words" },
      { id: "w100", label: "100 words" },
    ],
  },
  {
    title: "Time",
    options: [
      { id: "t15", label: "15 seconds" },
      { id: "t30", label: "30 seconds" },
      { id: "t60", label: "60 seconds" },
      { id: "t120", label: "120 seconds" },
    ],
  },
];

const PRESET_IDS: readonly LeaderboardPreset[] = [
  "any",
  "w10",
  "w25",
  "w50",
  "w100",
  "t15",
  "t30",
  "t60",
  "t120",
];

const PRESET_LABEL_BY_ID = new Map<LeaderboardPreset, string>(
  PRESET_GROUPS.flatMap((g) => g.options.map((o) => [o.id, o.label] as const)),
);
export function presetLabel(id: LeaderboardPreset): string {
  return PRESET_LABEL_BY_ID.get(id) ?? "All lengths";
}

export const MODE_LABEL: Record<string, string> = {
  race: "race",
  training: "training",
  casual: "casual",
  reverse_adaptive: "reverse",
};

export function parseScope(s: string | null): LeaderboardScope {
  if (s === "race" || s === "training" || s === "casual" || s === "all") return s;
  return "all";
}

export function parseWindow(s: string | null): LeaderboardWindow {
  if (s === "month" || s === "week" || s === "day" || s === "all_time") return s;
  return "all_time";
}

export function parsePreset(s: string | null): LeaderboardPreset {
  if (s == null) return "any";
  const found = PRESET_IDS.find((id) => id === s);
  return found ?? "any";
}

/** Which kind of ranking the main pane shows. Switched from the
 *  sidebar's "View" group.
 *    `table`   — the per-run leaderboard (default; respects the
 *                Mode / Window / Length filters)
 *    `players` — one row per user, ranked by lifetime peak net-WPM
 *    `levels`  — one row per user, ranked by accumulated XP / level
 *  The user-centric views ignore the filter trio above. */
export type LeaderboardView = "table" | "players" | "levels";

export const VIEWS: readonly { id: LeaderboardView; label: string }[] = [
  { id: "table", label: "Recent runs" },
  { id: "players", label: "Top players" },
  { id: "levels", label: "Top by level" },
];

export function parseView(s: string | null): LeaderboardView {
  if (s === "players" || s === "levels") return s;
  return "table";
}
