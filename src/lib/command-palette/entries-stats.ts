import type { AppearancePrefs } from "@/lib/appearance-prefs";
import { enumEntry, link, type Setter, toggle } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** Settings → Stats & results, then Settings → Multiplayer & social. */
export function statsEntries({
  ap,
  setAp,
}: {
  ap: AppearancePrefs;
  setAp: Setter<AppearancePrefs>;
}): CommandEntry[] {
  return [
    /* ─── Live stats ───────────────────────────────────────────── */
    toggle(
      "a.showLiveStats",
      "Show live stats",
      "The timer, speed and accuracy shown while you type",
      "Appearance",
      ap.statStripSurface !== "none",
      (v) => setAp("statStripSurface", v ? "plain" : "none"),
      ["stats", "wpm", "hud", "readouts"],
    ),
    link(
      "l.liveStats",
      "Live stats colour and opacity",
      "Open the live stats settings",
      "Appearance",
      "/customise/stats#live-stats",
      ["Stats & results", "Live stats"],
      ["stats", "timer", "speed", "accuracy"],
    ),

    /* ─── Result screen ────────────────────────────────────────── */
    enumEntry(
      "a.typingSpeedUnit",
      "Speed unit",
      "Words or characters, per minute, second or hour",
      "Appearance",
      ap.typingSpeedUnit,
      [
        { id: "wpm", label: "WPM" },
        { id: "cpm", label: "CPM" },
        { id: "wps", label: "WPS" },
        { id: "cps", label: "CPS" },
        { id: "wph", label: "WPH" },
      ] as const,
      (v) => setAp("typingSpeedUnit", v),
      ["stats", "unit"],
    ),
    enumEntry(
      "a.resultChrome",
      "Result layout",
      "Group the results into cards, or let them sit on the page",
      "Appearance",
      ap.resultChrome,
      [
        { id: "framed", label: "Cards" },
        { id: "spare", label: "Plain" },
      ] as const,
      (v) => setAp("resultChrome", v),
      ["result", "cards", "minimal"],
    ),
    toggle(
      "a.alwaysShowDecimal",
      "Always show decimals",
      "Show decimals without having to hover",
      "Appearance",
      ap.alwaysShowDecimal,
      (v) => setAp("alwaysShowDecimal", v),
      ["stats"],
    ),
    toggle(
      "a.startGraphsAtZero",
      "Start graphs at zero",
      "Turning this off zooms in, which makes changes look bigger",
      "Appearance",
      ap.startGraphsAtZero,
      (v) => setAp("startGraphsAtZero", v),
      ["result", "chart"],
    ),
    toggle(
      "a.resultShowAnalysis",
      "Result: show analysis",
      "What slowed you down, and where the time went",
      "Appearance",
      ap.resultShowAnalysis,
      (v) => setAp("resultShowAnalysis", v),
      ["result", "analysis", "breakdown", "mistakes", "pauses"],
    ),
    toggle(
      "a.resultShowExtras",
      "Result: run details",
      "Longest clean streak, words typed correctly and longest pause",
      "Appearance",
      ap.resultShowExtras,
      (v) => setAp("resultShowExtras", v),
      ["result"],
    ),
    toggle(
      "a.resultShowPerLetter",
      "Result: slowest letters",
      "The letters that took you longest inside words",
      "Appearance",
      ap.resultShowPerLetter,
      (v) => setAp("resultShowPerLetter", v),
      ["result"],
    ),
    toggle(
      "a.resultShowHandBalance",
      "Result: hand split",
      "How many of the test's letters each hand types on QWERTY",
      "Appearance",
      ap.resultShowHandBalance,
      (v) => setAp("resultShowHandBalance", v),
      ["result", "hands", "balance"],
    ),
    toggle(
      "a.resultShowHeatmap",
      "Result: text heatmap",
      "The text you typed, tinted by how fast each letter was",
      "Appearance",
      ap.resultShowHeatmap,
      (v) => setAp("resultShowHeatmap", v),
      ["result", "heatmap"],
    ),

    /* ─── Races ────────────────────────────────────────────────── */
    toggle(
      "a.multiplayerPlayerColors",
      "Race: player colours",
      "Give each racer their own colour so you can tell them apart",
      "Appearance",
      ap.multiplayerPlayerColors,
      (v) => setAp("multiplayerPlayerColors", v),
      ["race", "multiplayer"],
    ),
    enumEntry(
      "a.multiplayerOpponentMarker",
      "Race: opponents in the text",
      "Show where other racers are inside the text",
      "Appearance",
      ap.multiplayerOpponentMarker,
      [
        { id: "off", label: "Off" },
        { id: "tint", label: "Highlight" },
        { id: "text", label: "Colour" },
      ] as const,
      (v) => setAp("multiplayerOpponentMarker", v),
      ["race", "multiplayer"],
    ),
    toggle(
      "a.multiplayerRaceFeed",
      "Race: feed",
      "A running log of joins, lead changes and finishes",
      "Appearance",
      ap.multiplayerRaceFeed,
      (v) => setAp("multiplayerRaceFeed", v),
      ["race", "multiplayer"],
    ),
    toggle(
      "a.multiplayerShowOpponentWpm",
      "Race: opponent speed",
      "Show each racer's live speed next to their lane",
      "Appearance",
      ap.multiplayerShowOpponentWpm,
      (v) => setAp("multiplayerShowOpponentWpm", v),
      ["race", "multiplayer"],
    ),
  ];
}
