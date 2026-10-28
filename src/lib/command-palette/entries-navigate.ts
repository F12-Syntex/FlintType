import { link } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** One "<Page> settings" entry per settings page. Kept in step with
 *  the page catalog in src/app/customise/_components/groups.ts (lib
 *  code doesn't import from app/). */
export const SETTINGS_PAGES: readonly {
  id: string;
  name: string;
  href: string;
  hint: string;
  keywords: readonly string[];
}[] = [
  { id: "theme", name: "Theme", href: "/customise/theme", hint: "Palette, mode, colours, background image", keywords: ["palette", "colour", "color", "dark", "light"] },
  { id: "typing", name: "Typing", href: "/customise/typing", hint: "Font, caret, tape mode, mistakes", keywords: ["font", "caret", "tape", "passage"] },
  { id: "interface", name: "Interface", href: "/customise/interface", hint: "Style, surfaces, corners, top bar and footer", keywords: ["minimal", "chrome", "radius", "borders", "style", "font", "shadow"] },
  { id: "keyboard", name: "Keyboard", href: "/customise/keyboard", hint: "On-screen keyboard: layout, key style and size", keywords: ["keymap", "layout", "qwerty", "dvorak", "colemak"] },
  { id: "stats", name: "Stats & results", href: "/customise/stats", hint: "Live numbers and the result screen", keywords: ["wpm", "accuracy", "result", "live"] },
  { id: "behaviour", name: "Behaviour", href: "/customise/behaviour", hint: "Mistakes, backspace, word lists, sound", keywords: ["behavior", "input", "sound", "burst"] },
  { id: "social", name: "Multiplayer & social", href: "/customise/social", hint: "Race visuals and live spectating", keywords: ["race", "multiplayer", "spectate", "friends"] },
];

/** Settings → Theme deep links (colour pickers and the image upload
 *  don't fit a one-line palette row), then plain navigation. */
export function navigateEntries(go: (href: string) => void): CommandEntry[] {
  const action = (
    id: string,
    label: string,
    hint: string,
    href: string,
    keywords: readonly string[],
  ): CommandEntry => ({
    id,
    label,
    hint,
    group: "Navigate",
    kind: "action",
    run: () => go(href),
    keywords,
  });

  return [
    link(
      "l.colors",
      "Colours",
      "Change single colours on top of your palette",
      "Theme",
      "/customise/theme#colors",
      "Theme · Colours",
      ["color", "colour", "accent", "palette"],
    ),
    link(
      "l.background",
      "Background image",
      "Put an image behind the app",
      "Theme",
      "/customise/theme#background",
      "Theme · Background",
      ["image", "wallpaper", "photo"],
    ),
    link(
      "l.gallery",
      "Palette gallery",
      "See every palette side by side at full size",
      "Theme",
      "/customise/appearance/themes",
      "Theme · All palettes",
      ["themes", "browse", "palettes"],
    ),
    // The practice surface is at "/" (/app 404s, #49 / FT-014).
    action("nav.app", "Go to test", "Open the typing test", "/", ["practice", "type", "test"]),
    action("nav.customise", "Settings", "Open settings", "/customise", ["settings", "customise", "preferences", "options"]),
    ...SETTINGS_PAGES.map((p) =>
      action(`nav.settings.${p.id}`, `${p.name} settings`, p.hint, p.href, [
        "settings",
        "customise",
        ...p.keywords,
      ]),
    ),
    action("nav.ai", "Design with AI", "Describe a look and preview it before applying", "/customise/appearance/ai", ["ai", "assistant", "design", "generate"]),
    action("nav.leaderboard", "Leaderboard", "Top runs across the community", "/leaderboard", ["leaderboard", "rankings"]),
    action("nav.profile", "Your profile", "Personal bests, history and stats", "/profile", ["profile", "account", "pb"]),
  ];
}
