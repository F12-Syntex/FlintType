import type { AppearancePrefs } from "@/lib/appearance-prefs";
import type { ThemeVar } from "@/lib/theme-customization";

/** The settings catalog — the single source of truth for the sidebar,
 *  the mobile section picker, page headers and the legacy-anchor
 *  redirect. Settings are split into task-based groups (one route
 *  each); every group lists its sections, whose ids double as the
 *  in-page anchors (`/customise/<group>#<section>`).
 *
 *  Pure data + pure helpers, no React, so it's unit-tested. */

export type SettingsGroupId =
  | "theme"
  | "typing"
  | "interface"
  | "keyboard"
  | "stats"
  | "behaviour"
  | "social";

export type SettingsSectionEntry = {
  /** Anchor id of the `<section>` on the group page. */
  id: string;
  /** Sidebar / heading label. */
  name: string;
};

export type SettingsGroup = {
  id: SettingsGroupId;
  /** Sidebar label and the page's h1. */
  name: string;
  href: `/customise/${SettingsGroupId}`;
  /** One plain sentence under the page title. */
  description: string;
  sections: readonly SettingsSectionEntry[];
  /** Anchors that live *inside* another section on this page (rows
   *  that used to be sections of their own). They redirect correctly
   *  but don't get a sidebar entry. */
  rowAnchors?: readonly string[];
};

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    id: "theme",
    name: "Theme",
    href: "/customise/theme",
    description: "Colours, light or dark mode, and a background image.",
    sections: [
      { id: "themes", name: "Theme & mode" },
      { id: "colors", name: "Colours" },
      { id: "background", name: "Background" },
    ],
  },
  {
    id: "typing",
    name: "Typing",
    href: "/customise/typing",
    description: "How the text you type looks while you type it.",
    sections: [
      { id: "typography", name: "Font" },
      { id: "caret", name: "Caret" },
      { id: "typing-area", name: "Typing area" },
    ],
    rowAnchors: ["mistakes", "tape"],
  },
  {
    id: "interface",
    name: "Interface",
    href: "/customise/interface",
    description: "The shape, depth and type of the app around the test.",
    sections: [
      { id: "style", name: "Style" },
      { id: "surface", name: "Surfaces" },
      { id: "geometry", name: "Corners & borders" },
      { id: "chrome", name: "Top bar & footer" },
    ],
  },
  {
    id: "keyboard",
    name: "Keyboard",
    href: "/customise/keyboard",
    description: "The on-screen keyboards shown under the text.",
    sections: [
      { id: "keyboard", name: "Practice keyboard" },
      { id: "keymap", name: "Keymap overlay" },
    ],
  },
  {
    id: "stats",
    name: "Stats & results",
    href: "/customise/stats",
    description: "The numbers you see during a test and after it.",
    sections: [
      { id: "live-stats", name: "Live stats" },
      { id: "result", name: "Result screen" },
    ],
  },
  {
    id: "behaviour",
    name: "Behaviour",
    href: "/customise/behaviour",
    description: "How the test reacts to your keystrokes.",
    sections: [
      { id: "input-handling", name: "Input" },
      { id: "word-list", name: "Word list" },
      { id: "burst", name: "Burst mode" },
      { id: "audio", name: "Sound" },
      { id: "adaptive", name: "Adaptive practice" },
    ],
  },
  {
    id: "social",
    name: "Multiplayer & social",
    href: "/customise/social",
    description: "How races look and who can watch you practise.",
    sections: [
      { id: "multiplayer", name: "Races" },
      { id: "spectate", name: "Live spectating" },
    ],
  },
];

export const DEFAULT_GROUP = SETTINGS_GROUPS[0]!;

export function findGroup(id: string): SettingsGroup | null {
  return SETTINGS_GROUPS.find((g) => g.id === id) ?? null;
}

/** A group by id — for pages, which always name a real group. */
export function getGroup(id: SettingsGroupId): SettingsGroup {
  const g = findGroup(id);
  if (!g) throw new Error(`Unknown settings group: ${id}`);
  return g;
}

/** The catalog name of a section, so page headings and the sidebar
 *  never drift apart. */
export function sectionTitle(group: SettingsGroup, sectionId: string): string {
  const s = group.sections.find((x) => x.id === sectionId);
  if (!s) throw new Error(`Unknown section ${sectionId} in ${group.id}`);
  return s.name;
}

/** The group a section (or row anchor) lives on. */
export function groupForSection(sectionId: string): SettingsGroup | null {
  return (
    SETTINGS_GROUPS.find(
      (g) =>
        g.sections.some((s) => s.id === sectionId) ||
        (g.rowAnchors ?? []).includes(sectionId),
    ) ?? null
  );
}

/** Which group the current route belongs to. The palette explorer
 *  (`/customise/appearance/themes`) is part of Theme. */
export function groupForPath(pathname: string): SettingsGroup | null {
  if (pathname.startsWith("/customise/appearance/themes")) {
    return findGroup("theme");
  }
  const seg = pathname.split("/")[2] ?? "";
  return findGroup(seg);
}

/** Map an old `/customise/appearance#<id>` link (the single long page
 *  this catalog replaced) to its new home. Unknown or empty hashes land
 *  on the first group. */
export function legacyAppearanceHref(hash: string): string {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return DEFAULT_GROUP.href;
  const group = groupForSection(id);
  return group ? `${group.href}#${id}` : DEFAULT_GROUP.href;
}

/* ─── Per-group ownership of the shared stores ──────────────────── */

/** Which appearance-pref fields each group's controls write. Drives
 *  the header's "Reset (N)" count and what that reset clears, so a
 *  reset on one page never touches another page's settings. */
export const GROUP_APPEARANCE_KEYS: Readonly<
  Partial<Record<SettingsGroupId, readonly (keyof AppearancePrefs)[]>>
> = {
  typing: [
    "highlightMode",
    "typedEffect",
    "markIncompleteWord",
    "mistakeStyle",
    "tapeMode",
    "tapeMargin",
    "tapeFade",
    "smoothLineScroll",
    "linesRendered",
    "maxLineWidth",
    "caretIdle",
    "quoteAttribution",
  ],
  interface: [
    "controlShape",
    "depth",
    "buttonGlow",
    "pageAura",
    "uiFont",
    "uiScale",
    "cardSurfaces",
    "dividers",
    "pagePadding",
    "backgroundFill",
    "monochromeChrome",
    "borders",
    "topbarStyle",
    "footerStyle",
    "autoHide",
  ],
  keyboard: [
    "keymap",
    "keymapLayout",
    "keymapStyle",
    "keymapLegend",
    "keymapTopRow",
    "keymapSize",
    "keymapCompact",
  ],
  stats: [
    "statStripSurface",
    "liveProgressStyle",
    "liveSpeedStyle",
    "liveAccuracyStyle",
    "liveBurstStyle",
    "liveStatsColor",
    "liveStatsOpacity",
    "alwaysShowDecimal",
    "typingSpeedUnit",
    "startGraphsAtZero",
    "resultShowExtras",
    "resultShowPerLetter",
    "resultShowHandBalance",
    "resultShowHeatmap",
    "resultChrome",
  ],
  social: [
    "multiplayerPlayerColors",
    "multiplayerOpponentMarker",
    "multiplayerRaceFeed",
    "multiplayerShowOpponentWpm",
  ],
};

/** Which theme-override CSS vars each group owns. Colours belong to
 *  Theme, the passage font to Typing, the corner radius to Interface. */
export const GROUP_THEME_VARS: Readonly<
  Partial<Record<SettingsGroupId, readonly ThemeVar[]>>
> = {
  theme: [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--accent",
    "--accent-foreground",
    "--muted",
    "--muted-foreground",
    "--border",
    "--input",
    "--ring",
    "--ft-passage-typed",
    "--ft-passage-untyped",
    "--ft-passage-error",
  ],
  typing: ["--ft-font-family", "--ft-font-scale", "--ft-word-spacing"],
  interface: ["--radius"],
};

/** How many of `keys` differ from their default. */
export function countCustomised<T extends object>(
  prefs: T,
  defaults: T,
  keys: readonly (keyof T)[],
): number {
  return keys.reduce((n, k) => n + (prefs[k] !== defaults[k] ? 1 : 0), 0);
}

/** A partial that puts every one of `keys` back to its default. */
export function defaultsFor<T extends object>(
  defaults: T,
  keys: readonly (keyof T)[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) out[k] = defaults[k];
  return out;
}

/** How many of `vars` carry a real (non-empty) override. */
export function countOverriddenVars(
  overrides: Partial<Record<ThemeVar, string>>,
  vars: readonly ThemeVar[],
): number {
  return vars.reduce((n, v) => {
    const x = overrides[v];
    return n + (typeof x === "string" && x !== "" ? 1 : 0);
  }, 0);
}
