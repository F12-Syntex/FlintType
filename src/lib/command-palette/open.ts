/** Open the global Cmd/Ctrl+K command palette from anywhere — a
 *  "Search settings" button, the 404 page — without importing the
 *  palette component. `<CommandPalette>` listens for this event. */
export const OPEN_COMMAND_PALETTE_EVENT = "ft:command-palette:open";

export function openCommandPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
}

/** "⌘" on Apple platforms, "Ctrl" everywhere else — for the shortcut
 *  hint shown next to a search affordance. */
export function commandKeyLabel(platform: string): "⌘" | "Ctrl" {
  return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘" : "Ctrl";
}
