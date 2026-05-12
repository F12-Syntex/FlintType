import type {
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
