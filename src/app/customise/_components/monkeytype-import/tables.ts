/** MonkeyType config values (packages/schemas/src/configs.ts) and the
 *  flinttype value each one maps to. A value missing from a table has no
 *  match here and stays out of an import. */

export const CARET_STYLE = {
  off: "off",
  default: "line",
  block: "block",
  outline: "outline",
  underline: "underline",
} as const;
export const CARET_MOVEMENT = { off: 0, slow: 200, medium: 120, fast: 60 } as const;
// "bar" has no match.
export const TIMER_STYLE = {
  off: "off",
  text: "text",
  mini: "mini",
  flash_text: "flash",
  flash_mini: "flash",
} as const;
export const LIVE_STYLE = { off: "off", text: "text", mini: "mini" } as const;
export const HIGHLIGHT = {
  off: "off",
  letter: "letter",
  word: "word",
  next_word: "next-word",
  next_two_words: "next-word",
  next_three_words: "next-word",
} as const;
// "hide" and "dots" have no match.
export const TYPED_EFFECT = { keep: "off", fade: "fade" } as const;
export const TAPE = { off: "off", letter: "letter", word: "word" } as const;
export const SPEED_UNIT = { wpm: "wpm", cpm: "cpm", wps: "wps", cps: "cps", wph: "wph" } as const;
export const KEYMAP = { off: "off", static: "static", react: "react", next: "next" } as const;
export const KEYMAP_STYLE = {
  staggered: "staggered",
  matrix: "matrix",
  split: "split",
  split_matrix: "split",
  alice: "alice",
} as const;
export const KEYMAP_LEGEND = {
  lowercase: "lowercase",
  uppercase: "uppercase",
  blank: "blank",
  dynamic: "dynamic",
} as const;
// Minimal keyboards leave out the modifier keys, like Letters only.
export const KEYMAP_KEYS = {
  minimal: { keymapTopRow: "layout", keymapCompact: true },
  minimal_numrow: { keymapTopRow: "always", keymapCompact: true },
  full: { keymapTopRow: "always", keymapCompact: false },
} as const;
export const KEYMAP_TOP_ROW = { always: "always", layout: "layout", never: "never" } as const;
export const STOP_ON_ERROR = { off: false, word: true, letter: true } as const;
export const CONFIDENCE = { off: "off", on: "word", max: "all" } as const;
// flinttype can't stretch an image; cover fills the screen as "max" does.
export const BG_FIT = { cover: "cover", contain: "contain", max: "cover" } as const;
export const MODE = { words: "WORDS", time: "TIME", quote: "QUOTE" } as const;
