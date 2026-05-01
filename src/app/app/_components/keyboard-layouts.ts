import {
  ArrowBigUp,
  ChevronUp,
  Command,
  CornerDownLeft,
  Delete,
  Menu,
  Option,
  type LucideIcon,
} from "lucide-react";

/** A single physical key on a US ANSI 60% layout. `code` matches
 *  KeyboardEvent.code so the highlight reads the *physical* key the user
 *  pressed, regardless of which OS layout (Dvorak, Colemak, …) is active. */
export type KeyDef = {
  code: string;
  label?: string;
  shiftLabel?: string;
  icon?: LucideIcon;
  /** Width in keyboard units. 1u = standard letter key. */
  units?: number;
  variant?: "letter" | "modifier";
};

export type KeyboardLayout = {
  id: string;
  name: string;
  rows: readonly (readonly KeyDef[])[];
};

/* ─── Shared rows (same on every layout) ──────────────────────────── */

const NUMBER_ROW: readonly KeyDef[] = [
  { code: "Backquote", label: "`", shiftLabel: "~" },
  { code: "Digit1", label: "1", shiftLabel: "!" },
  { code: "Digit2", label: "2", shiftLabel: "@" },
  { code: "Digit3", label: "3", shiftLabel: "#" },
  { code: "Digit4", label: "4", shiftLabel: "$" },
  { code: "Digit5", label: "5", shiftLabel: "%" },
  { code: "Digit6", label: "6", shiftLabel: "^" },
  { code: "Digit7", label: "7", shiftLabel: "&" },
  { code: "Digit8", label: "8", shiftLabel: "*" },
  { code: "Digit9", label: "9", shiftLabel: "(" },
  { code: "Digit0", label: "0", shiftLabel: ")" },
  { code: "Minus", label: "-", shiftLabel: "_" },
  { code: "Equal", label: "=", shiftLabel: "+" },
  { code: "Backspace", icon: Delete, units: 2, variant: "modifier" },
];

const SPACE_ROW: readonly KeyDef[] = [
  { code: "ControlLeft", icon: ChevronUp, units: 1.25, variant: "modifier" },
  { code: "MetaLeft", icon: Command, units: 1.25, variant: "modifier" },
  { code: "AltLeft", icon: Option, units: 1.25, variant: "modifier" },
  { code: "Space", units: 6.25 },
  { code: "AltRight", icon: Option, units: 1.25, variant: "modifier" },
  { code: "MetaRight", icon: Command, units: 1.25, variant: "modifier" },
  { code: "ContextMenu", icon: Menu, units: 1.25, variant: "modifier" },
  { code: "ControlRight", icon: ChevronUp, units: 1.25, variant: "modifier" },
];

/* ─── Physical-position codes for the three alpha rows ────────────── */

const TOP_CODES = [
  "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP",
  "BracketLeft", "BracketRight",
] as const;

const HOME_CODES = [
  "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL",
  "Semicolon", "Quote",
] as const;

const BOTTOM_CODES = [
  "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM",
  "Comma", "Period", "Slash",
] as const;

/** Shift glyph for printable punctuation. Letters skip this — they
 *  uppercase via the `upper` flag in <Key>. */
const PUNCT_SHIFT: Record<string, string> = {
  ";": ":", "'": '"', ",": "<", ".": ">", "/": "?",
  "[": "{", "]": "}", "=": "+", "-": "_",
};

function buildRow(
  codes: readonly string[],
  chars: readonly string[],
): readonly KeyDef[] {
  if (chars.length !== codes.length) {
    throw new Error(
      `keyboard layout row mismatch: ${chars.length} chars vs ${codes.length} codes`,
    );
  }
  return codes.map((code, i) => {
    const ch = chars[i]!;
    const shift = PUNCT_SHIFT[ch];
    return shift ? { code, label: ch, shiftLabel: shift } : { code, label: ch };
  });
}

function buildLayout(
  id: string,
  name: string,
  top: readonly string[],
  home: readonly string[],
  bottom: readonly string[],
): KeyboardLayout {
  return {
    id,
    name,
    rows: [
      NUMBER_ROW,
      [
        { code: "Tab", label: "Tab", units: 1.5, variant: "modifier" },
        ...buildRow(TOP_CODES, top),
        { code: "Backslash", label: "\\", shiftLabel: "|", units: 1.5 },
      ],
      [
        { code: "CapsLock", label: "Caps", units: 1.75, variant: "modifier" },
        ...buildRow(HOME_CODES, home),
        { code: "Enter", icon: CornerDownLeft, units: 2.25, variant: "modifier" },
      ],
      [
        { code: "ShiftLeft", icon: ArrowBigUp, units: 2.25, variant: "modifier" },
        ...buildRow(BOTTOM_CODES, bottom),
        { code: "ShiftRight", icon: ArrowBigUp, units: 2.75, variant: "modifier" },
      ],
      SPACE_ROW,
    ],
  };
}

/* ─── The three shipped layouts ───────────────────────────────────── */

export const LAYOUTS = {
  qwerty: buildLayout(
    "qwerty",
    "QWERTY",
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ),
  dvorak: buildLayout(
    "dvorak",
    "Dvorak",
    ["'", ",", ".", "p", "y", "f", "g", "c", "r", "l", "/", "="],
    ["a", "o", "e", "u", "i", "d", "h", "t", "n", "s", "-"],
    [";", "q", "j", "k", "x", "b", "m", "w", "v", "z"],
  ),
  colemak: buildLayout(
    "colemak",
    "Colemak",
    ["q", "w", "f", "p", "g", "j", "l", "u", "y", ";", "[", "]"],
    ["a", "r", "s", "t", "d", "h", "n", "e", "i", "o", "'"],
    ["z", "x", "c", "v", "b", "k", "m", ",", ".", "/"],
  ),
} as const satisfies Record<string, KeyboardLayout>;

export type LayoutId = keyof typeof LAYOUTS;
