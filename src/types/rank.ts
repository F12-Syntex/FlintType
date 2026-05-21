/** Flame-tier WPM ranks — a self-selected cosmetic flair a user can show
 *  on their profile (ui-law §14 / §17). The ladder is ordered ascending;
 *  `min` is the effective-WPM (60s) floor from the published table, used
 *  only to *suggest* a rank in the picker — selection is free, never
 *  enforced. Theme-fixed: the badge paints in the brand ember regardless
 *  of tier, so no rank is "louder" than another (one-spark rule). */
export const RANK_IDS = [
  "ember",
  "spark",
  "kindling",
  "flame",
  "blaze",
  "forge",
  "inferno",
  "wildfire",
  "firestorm",
  "supernova",
  "solar_flare",
] as const;

export type RankId = (typeof RANK_IDS)[number];

export type RankDef = {
  id: RankId;
  label: string;
  /** Effective WPM (60s) band, for the picker hint. */
  range: string;
  /** Inclusive lower bound of the band. */
  min: number;
};

export const RANKS: Record<RankId, RankDef> = {
  ember: { id: "ember", label: "Ember", range: "0–29", min: 0 },
  spark: { id: "spark", label: "Spark", range: "30–44", min: 30 },
  kindling: { id: "kindling", label: "Kindling", range: "45–59", min: 45 },
  flame: { id: "flame", label: "Flame", range: "60–79", min: 60 },
  blaze: { id: "blaze", label: "Blaze", range: "80–99", min: 80 },
  forge: { id: "forge", label: "Forge", range: "100–119", min: 100 },
  inferno: { id: "inferno", label: "Inferno", range: "120–149", min: 120 },
  wildfire: { id: "wildfire", label: "Wildfire", range: "150–179", min: 150 },
  firestorm: { id: "firestorm", label: "Firestorm", range: "180–209", min: 180 },
  supernova: { id: "supernova", label: "Supernova", range: "210–249", min: 210 },
  solar_flare: { id: "solar_flare", label: "Solar Flare", range: "250+", min: 250 },
};

export function isRankId(value: unknown): value is RankId {
  return (
    typeof value === "string" && (RANK_IDS as readonly string[]).includes(value)
  );
}

/** The shape stored under `profileRank` in the prefs blob. */
export type ProfileRankPref = { id: RankId | null };

/** The rank stored in the prefs blob, as an object slice
 *  (`profileRank: { id }`) so the object-only `useRemotePrefs` hook can
 *  bind it. Returns null for unset, malformed, or unknown ids. */
export function readProfileRank(prefs: Record<string, unknown>): RankId | null {
  const slice = prefs.profileRank;
  if (slice && typeof slice === "object" && "id" in slice) {
    const id = (slice as { id?: unknown }).id;
    return isRankId(id) ? id : null;
  }
  return null;
}

/** The rank the published table maps a given effective WPM to — used to
 *  preselect / suggest in the picker. Returns the highest rank whose
 *  floor the value clears. */
export function rankFromWpm(wpm: number): RankId {
  let match: RankId = "ember";
  for (const id of RANK_IDS) {
    if (wpm >= RANKS[id].min) match = id;
  }
  return match;
}
