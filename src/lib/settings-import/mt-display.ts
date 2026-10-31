import { bool, clamp, lookup, mtText, num, own, str, type MtCollector } from "./mt-values";
import { keymapSizeLabel } from "./labels";

/** MonkeyType's caret, typing area and on-screen keyboard settings,
 *  mapped onto flinttype's (MonkeyType semantics from its config
 *  metadata and frontend source). A mapped key whose value can't be
 *  used is listed, never dropped silently. Pure. */

/** smoothCaret → the Movement preset closest to MonkeyType's timing
 *  (off 0, fast 85, medium 100, slow 150 ms), keeping their order. */
const MOVEMENT: Record<string, number> = { off: 0, fast: 60, medium: 120, slow: 200 };
const CARET: Record<string, string> = {
  default: "line", block: "block", outline: "outline", underline: "underline", off: "off",
};
const HIGHLIGHT: Record<string, string> = {
  off: "off", letter: "letter", word: "word",
  next_word: "next-word", next_two_words: "next-word", next_three_words: "next-word",
};
export const same = (...ids: string[]): Record<string, string> => Object.fromEntries(ids.map((id) => [id, id]));
const TAPE = same("off", "word", "letter");
const KEYMAP = same("off", "static", "react", "next");
const LAYOUTS = same("qwerty", "dvorak", "colemak");
const KEYMAP_STYLES = same("staggered", "matrix", "split", "alice");
const LEGENDS = same("lowercase", "uppercase", "blank", "dynamic");
const KEYMAP_KEYS: Record<string, { topRow: string; compact: boolean }> = {
  minimal: { topRow: "layout", compact: true },
  minimal_numrow: { topRow: "always", compact: true },
  full: { topRow: "always", compact: false },
};

export function mapCaret(col: MtCollector): void {
  const style = own(col.mt, "caretStyle");
  const caret = lookup(CARET, style);
  if (caret) {
    col.use("caretStyle");
    col.slice("caret", "caret", "style", "Style", mtText(style), caret);
  } else if (typeof style === "string") {
    col.bad("caretStyle", "Caret style", "Picture carets aren't available.");
  } else col.junk("caretStyle", "Caret style");

  const smooth = own(col.mt, "smoothCaret");
  const speed = lookup(MOVEMENT, smooth);
  if (speed !== undefined) {
    col.use("smoothCaret");
    col.slice("caret", "caret", "smoothSpeed", "Movement", mtText(smooth), speed);
  } else col.junk("smoothCaret", "Smooth caret");
}

export function mapTypingArea(col: MtCollector): void {
  const { mt } = col;
  const hl = own(mt, "highlightMode");
  const highlight = lookup(HIGHLIGHT, hl);
  if (highlight) {
    col.use("highlightMode");
    col.slice("typing", "appearance", "highlightMode", "Highlight", mtText(hl), highlight);
  } else col.junk("highlightMode", "Highlight mode");

  const typed = str(mt, "typedEffect");
  if (typed === "keep" || typed === "fade") {
    col.use("typedEffect");
    col.slice("typing", "appearance", "typedEffect", "Typed words", mtText(typed), typed === "keep" ? "off" : "fade");
  } else if (typed === "hide" || typed === "dots") {
    col.bad("typedEffect", "Typed effect", "Hiding typed words isn't available.");
  } else col.junk("typedEffect", "Typed effect");

  const tape = lookup(TAPE, own(mt, "tapeMode"));
  if (tape) {
    col.use("tapeMode");
    col.slice("typing", "appearance", "tapeMode", "Tape", mtText(tape), tape);
  } else col.junk("tapeMode", "Tape mode");

  const margin = num(mt, "tapeMargin");
  if (margin !== undefined) {
    col.use("tapeMargin");
    const value = clamp(Math.round(margin), 0, 100);
    col.slice("typing", "appearance", "tapeMargin", "Caret position", `${mtText(margin)}%`, value);
  } else col.junk("tapeMargin", "Tape margin");

  const all = bool(mt, "showAllLines");
  if (all !== undefined) {
    col.use("showAllLines");
    // MonkeyType shows three lines unless Show all lines is on.
    const origin = `With Show all lines ${all ? "on" : "off"}`;
    col.slice("typing", "appearance", "linesRendered", "Lines shown", mtText(all), all ? 0 : 3, { origin });
  } else col.junk("showAllLines", "Show all lines");

  const width = num(mt, "maxLineWidth");
  if (width !== undefined) {
    col.use("maxLineWidth");
    const value = width <= 0 ? 0 : clamp(Math.round(width), 30, 200);
    col.slice("typing", "appearance", "maxLineWidth", "Line width", width <= 0 ? "Full" : `${mtText(width)} ch`, value);
  } else col.junk("maxLineWidth", "Max line width");

  const smooth = bool(mt, "smoothLineScroll");
  if (smooth !== undefined) {
    col.use("smoothLineScroll");
    col.slice("typing", "appearance", "smoothLineScroll", "Smooth scrolling", mtText(smooth), smooth);
  } else col.junk("smoothLineScroll", "Smooth line scroll");
}

function mapKeymapLayout(col: MtCollector): void {
  const layout = own(col.mt, "keymapLayout");
  if (typeof layout !== "string") return col.junk("keymapLayout", "Keymap layout");
  // overrideSync draws the layout MonkeyType emulates, or QWERTY.
  const resolved =
    layout === "overrideSync" ? (lookup(LAYOUTS, own(col.mt, "layout")) ?? "qwerty") : lookup(LAYOUTS, layout);
  if (resolved) {
    col.use("keymapLayout");
    col.slice("keyboard", "appearance", "keymapLayout", "Layout", mtText(layout), resolved);
  } else {
    col.bad("keymapLayout", "Keymap layout", "The on-screen keyboard has QWERTY, Dvorak and Colemak.");
  }
}

export function mapKeyboard(col: MtCollector): void {
  const { mt } = col;
  const mode = lookup(KEYMAP, own(mt, "keymapMode"));
  if (mode) {
    col.use("keymapMode");
    col.slice("keyboard", "appearance", "keymap", "Show keyboard", mtText(mode), mode);
  } else col.junk("keymapMode", "Keymap mode");

  mapKeymapLayout(col);

  const style = own(mt, "keymapStyle");
  const arrangement = lookup(KEYMAP_STYLES, style);
  if (arrangement) {
    col.use("keymapStyle");
    col.slice("keyboard", "appearance", "keymapStyle", "Key arrangement", mtText(style), arrangement);
  } else if (typeof style === "string") {
    col.bad("keymapStyle", "Keymap style", "Staggered, Matrix, Split and Alice are available.");
  } else col.junk("keymapStyle", "Keymap style");

  const legend = lookup(LEGENDS, own(mt, "keymapLegendStyle"));
  if (legend) {
    col.use("keymapLegendStyle");
    col.slice("keyboard", "appearance", "keymapLegend", "Key labels", mtText(legend), legend);
  } else col.junk("keymapLegendStyle", "Keymap legend style");

  const keysId = own(mt, "keymapKeys");
  const keys = lookup(KEYMAP_KEYS, keysId);
  if (keys) {
    col.use("keymapKeys");
    col.slice("keyboard", "appearance", "keymapTopRow", "Number row", mtText(keysId), keys.topRow);
    col.slice("keyboard", "appearance", "keymapCompact", "Letters only", mtText(keysId), keys.compact);
  } else col.junk("keymapKeys", "Keymap keys");

  const size = num(mt, "keymapSize");
  if (size !== undefined) {
    col.use("keymapSize");
    const value = Math.round(clamp(size, 0.5, 3.5) * 10) / 10;
    // Name MonkeyType's size only when the slider can't hold it exactly.
    col.slice("keyboard", "appearance", "keymapSize", "Size", value === size ? keymapSizeLabel(value) : `size ${mtText(size)}`, value);
  } else col.junk("keymapSize", "Keymap size");
}
