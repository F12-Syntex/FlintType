/** The Appearance section catalog — single source of truth for the
 *  sidebar, the overview grid, and the dynamic sub-page metadata. Each
 *  entry maps an id to its display name, route, and a one-line blurb
 *  surfaced on the overview cards. The actual page bodies are bespoke
 *  (each is its own page.tsx) — only the labels live here so we don't
 *  duplicate them across sidebar, header, breadcrumbs, and metadata. */

export type AppearanceSection = {
  id: string;
  /** Display name in the sidebar and the page header. */
  name: string;
  /** One-sentence description shown on the overview card and in the
   *  page header subtitle. */
  blurb: string;
};

export const APPEARANCE_SECTIONS: readonly AppearanceSection[] = [
  {
    id: "themes",
    name: "Themes & mode",
    blurb: "Pick a community palette and flip between light and dark.",
  },
  {
    id: "colors",
    name: "Colors",
    blurb: "Override the active palette one variable at a time.",
  },
  {
    id: "geometry",
    name: "Geometry",
    blurb: "Corner radius and the borders rule across the app.",
  },
  {
    id: "surface",
    name: "Surface",
    blurb: "Collapse card surfaces, dividers, padding — the minimal/Monkeytype look.",
  },
  {
    id: "chrome",
    name: "Chrome",
    blurb: "Topbar, footer, mode bar style + auto-hide while typing.",
  },
  {
    id: "caret",
    name: "Caret & cursor",
    blurb: "Style, thickness, blink — the marker that follows your typing.",
  },
  {
    id: "mistakes",
    name: "Mistakes",
    blurb: "How mistyped letters in the current word are shown.",
  },
  {
    id: "typography",
    name: "Typography",
    blurb: "Font family, size, and word spacing of the practice passage.",
  },
  {
    id: "keyboard",
    name: "Keyboard",
    blurb: "Visualisation of the live keyboard widget under the passage.",
  },
  {
    id: "background",
    name: "Background",
    blurb: "Background image, opacity, and reactive shimmer.",
  },
  {
    id: "live-stats",
    name: "Live stats",
    blurb: "WPM and accuracy ticker rendered alongside the passage.",
  },
  {
    id: "typing-area",
    name: "Typing area",
    blurb: "Line count, max width, tape vs free-flow, margin.",
  },
  {
    id: "result",
    name: "Result",
    blurb: "What the post-test screen shows — chart, highlights, tips.",
  },
  {
    id: "keymap",
    name: "Keymap",
    blurb: "Hand-layout that powers the heatmap and ergonomic stats.",
  },
  {
    id: "multiplayer",
    name: "Multiplayer",
    blurb: "Live opponent markers in the race passage and lane cosmetics.",
  },
];

export function findAppearanceSection(id: string): AppearanceSection | null {
  return APPEARANCE_SECTIONS.find((s) => s.id === id) ?? null;
}
