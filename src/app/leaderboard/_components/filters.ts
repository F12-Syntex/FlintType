import type {
  LeaderboardPreset,
  LeaderboardScope,
  LeaderboardWindow,
} from "@/types/leaderboard";

/** Filter vocabulary for /leaderboard, plus the pure URL <-> filter
 *  mapping. Every filter lives in the query string so a board can be
 *  shared or bookmarked; defaults are omitted to keep URLs short.
 *  Plain-language labels for a slice live in `slice-labels.ts`. */

// Only the two solo practice modes rank: Casual and Adapt (the adaptive
// "training" mode), so the board compares like-for-like runs.
export const SCOPES: readonly { id: LeaderboardScope; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "training", label: "Adapt" },
];

export const WINDOWS: readonly {
  id: LeaderboardWindow;
  label: string;
  /** Short form for the mobile filter sheet's segmented switch. */
  short: string;
}[] = [
  { id: "all_time", label: "All time", short: "All time" },
  { id: "month", label: "This month", short: "Month" },
  { id: "week", label: "This week", short: "Week" },
  { id: "day", label: "Today", short: "Today" },
];

export type PresetOption = {
  id: LeaderboardPreset;
  label: string;
  short: string;
};

/** Test-length presets, grouped Words / Time; "any" sits outside. */
export const PRESET_GROUPS: readonly {
  title: string;
  options: readonly PresetOption[];
}[] = [
  {
    title: "Words",
    options: [
      { id: "w10", label: "10 words", short: "10" },
      { id: "w25", label: "25 words", short: "25" },
      { id: "w50", label: "50 words", short: "50" },
      { id: "w100", label: "100 words", short: "100" },
    ],
  },
  {
    title: "Time",
    options: [
      { id: "t15", label: "15 seconds", short: "15s" },
      { id: "t30", label: "30 seconds", short: "30s" },
      { id: "t60", label: "60 seconds", short: "60s" },
      { id: "t120", label: "120 seconds", short: "120s" },
    ],
  },
];

export const ALL_LENGTHS_LABEL = "All lengths";

/** The board opens on the 60-second time test, like most typing sites. */
export const DEFAULT_PRESET: LeaderboardPreset = "t60";

const PRESETS = PRESET_GROUPS.flatMap((g) => g.options);

export function presetLabel(id: LeaderboardPreset): string {
  return PRESETS.find((o) => o.id === id)?.label ?? ALL_LENGTHS_LABEL;
}

export const MODE_LABEL: Record<string, string> = {
  race: "Race",
  training: "Adapt",
  casual: "Casual",
  reverse_adaptive: "Reverse",
};

/** Which ranking the board shows.
 *    `table`   - best runs (respects Mode / Window / Length / audience)
 *    `players` - one row per user, ranked by lifetime peak net WPM
 *    `levels`  - one row per user, ranked by level (total XP from
 *                tests, drills and races)
 *  The two user-centric views ignore the filters. */
export type LeaderboardView = "table" | "players" | "levels";

export const VIEWS: readonly { id: LeaderboardView; label: string }[] = [
  { id: "table", label: "Best runs" },
  { id: "players", label: "Players" },
  { id: "levels", label: "Level" },
];

/** The page header's one line per view (plain strings so the server
 *  header can render the default). */
export const VIEW_DESCRIPTIONS: Record<LeaderboardView, string> = {
  table: "Ranked by net WPM (raw × accuracy).",
  players: "Each player's best run, ranked by net WPM.",
  levels: "Ranked by level. Tests, drills and races all earn XP.",
};

/** Everyone, or the people you follow plus you (signed-in only). */
export type LeaderboardAudience = "global" | "friends";

export type LeaderboardFilters = {
  view: LeaderboardView;
  scope: LeaderboardScope;
  window: LeaderboardWindow;
  preset: LeaderboardPreset;
  audience: LeaderboardAudience;
};

/** Legacy `all` / `race` scopes from old shared URLs degrade to Casual
 *  rather than breaking the filter. */
export function parseScope(s: string | null): LeaderboardScope {
  if (s === "training" || s === "casual") return s;
  return "casual";
}

export function parseWindow(s: string | null): LeaderboardWindow {
  if (s === "month" || s === "week" || s === "day" || s === "all_time") return s;
  return "all_time";
}

/** No param means the default (60 seconds). "All lengths" is written
 *  explicitly as `preset=any`, so it survives a round trip. */
export function parsePreset(s: string | null): LeaderboardPreset {
  if (s === "any") return "any";
  return PRESETS.find((o) => o.id === s)?.id ?? DEFAULT_PRESET;
}

export function parseView(s: string | null): LeaderboardView {
  if (s === "players" || s === "levels") return s;
  return "table";
}

export function parseAudience(s: string | null): LeaderboardAudience {
  return s === "friends" ? "friends" : "global";
}

export function parseFilters(
  get: (key: string) => string | null,
): LeaderboardFilters {
  return {
    view: parseView(get("view")),
    scope: parseScope(get("scope")),
    window: parseWindow(get("window")),
    preset: parsePreset(get("preset")),
    audience: parseAudience(get("audience")),
  };
}

/** Friends needs a signed-in viewer. Once auth has loaded and nobody is
 *  signed in, a shared `?audience=friends` link shows (and names) the
 *  global board. While auth is still loading the URL value stands, so a
 *  signed-in viewer never sees the global board flash in first. */
export function withAuth(
  f: LeaderboardFilters,
  auth: { isLoaded: boolean; isSignedIn: boolean },
): LeaderboardFilters {
  if (f.audience === "friends" && auth.isLoaded && !auth.isSignedIn) {
    return { ...f, audience: "global" };
  }
  return f;
}

/** Serialise filters into a query string, omitting defaults. Unrelated
 *  params already on `base` are kept. Returns "" when nothing is set. */
export function filtersToQuery(
  f: LeaderboardFilters,
  base: URLSearchParams = new URLSearchParams(),
): string {
  const sp = new URLSearchParams(base.toString());
  const put = (key: string, value: string, fallback: string) => {
    if (value === fallback) sp.delete(key);
    else sp.set(key, value);
  };
  put("view", f.view, "table");
  put("scope", f.scope, "casual");
  put("window", f.window, "all_time");
  put("preset", f.preset, DEFAULT_PRESET);
  put("audience", f.audience, "global");
  return sp.toString();
}
