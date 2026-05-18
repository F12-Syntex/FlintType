/** A single entry in the command palette. Every entry has an id, a
 *  display label, a group it belongs to, and a kind that decides how it
 *  renders + what happens on Enter.
 *
 *  Kinds:
 *    - `action`   — one-shot side effect (run a function, navigate).
 *    - `toggle`   — boolean setting; Enter flips the value in place.
 *    - `enum`     — discrete-choice setting; selecting the entry opens
 *                   a sub-list inside the palette where each option is
 *                   its own row. Enter on an option writes it back.
 *    - `link`     — for settings whose control type doesn't fit inline
 *                   (sliders, colour pickers, complex composites). The
 *                   palette closes and the customise page opens at the
 *                   relevant anchor. */

export type CommandGroup =
  | "Practice"
  | "Theme"
  | "Mode"
  | "Appearance"
  | "Behaviour"
  | "Caret"
  | "Keyboard"
  | "Navigate";

type EntryBase = {
  id: string;
  /** Headline shown to the user. */
  label: string;
  /** Short description below the label (search-indexed). */
  hint?: string;
  /** Logical bucket — drives the heading in the palette list. */
  group: CommandGroup;
  /** Extra search tokens not visible in the label. */
  keywords?: readonly string[];
};

export type ActionEntry = EntryBase & {
  kind: "action";
  run: () => void;
};

export type ToggleEntry = EntryBase & {
  kind: "toggle";
  /** Current value, surfaced as a trailing chip. */
  value: boolean;
  set: (next: boolean) => void;
};

export type EnumOption = {
  id: string;
  label: string;
};

export type EnumEntry = EntryBase & {
  kind: "enum";
  /** Current value, surfaced as a trailing chip ("Bold"). */
  value: string;
  options: readonly EnumOption[];
  /** Caller is responsible for narrowing the string back to the
   *  setting's actual union type — the registry helper does this via
   *  a typed wrapper, so consumers don't need to. */
  set: (next: string) => void;
};

export type LinkEntry = EntryBase & {
  kind: "link";
  /** Where to send the user. Same-origin only. */
  href: string;
  /** Short label for what the user will land on, e.g. "Slider on
   *  Customise → Typography". */
  destination: string;
};

export type CommandEntry =
  | ActionEntry
  | ToggleEntry
  | EnumEntry
  | LinkEntry;
