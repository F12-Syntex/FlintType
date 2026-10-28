import type { AppearancePrefs } from "@/lib/appearance-prefs";
import type { CaretSettings } from "@/lib/caret-settings";
import { enumEntry, link, type Setter, toggle } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** Blink presets, in the order and with the values of Settings →
 *  Typing → Caret, so the matching option lights up there. */
const BLINK = [
  { id: "off", label: "Off", ms: 0 },
  { id: "slow", label: "Slow", ms: 1500 },
  { id: "normal", label: "Normal", ms: 1000 },
  { id: "fast", label: "Fast", ms: 500 },
] as const;
type BlinkId = (typeof BLINK)[number]["id"];

/** Caret movement presets, same values as Settings → Typing → Caret. */
const MOVEMENT = [
  { id: "off", label: "Off", ms: 0 },
  { id: "snappy", label: "Snappy", ms: 60 },
  { id: "smooth", label: "Smooth", ms: 120 },
  { id: "flow", label: "Flow", ms: 200 },
  { id: "glide", label: "Glide", ms: 300 },
  { id: "drift", label: "Drift", ms: 450 },
] as const;
type MovementId = (typeof MOVEMENT)[number]["id"];

function blinkId(ms: number): BlinkId {
  if (ms === 0) return "off";
  if (ms <= 600) return "fast";
  if (ms <= 1000) return "normal";
  return "slow";
}

function movementId(ms: number): MovementId {
  return MOVEMENT.reduce<MovementId>(
    (best, p) => (ms >= p.ms ? p.id : best),
    "off",
  );
}

/** Settings → Typing: font, caret and the typing area. */
export function typingEntries({
  ap,
  setAp,
  cs,
  setCs,
}: {
  ap: AppearancePrefs;
  setAp: Setter<AppearancePrefs>;
  cs: CaretSettings;
  setCs: (patch: Partial<CaretSettings>) => void;
}): CommandEntry[] {
  return [
    link(
      "l.typography",
      "Font",
      "Typeface, size and word spacing",
      "Appearance",
      "/customise/typing#typography",
      "Typing · Font",
      ["font", "type", "size", "typeface"],
    ),

    /* ─── Caret ────────────────────────────────────────────────── */
    enumEntry(
      "c.style",
      "Caret style",
      "Line, block, underline, outline, or off",
      "Caret",
      cs.style,
      [
        { id: "line", label: "Line" },
        { id: "block", label: "Block" },
        { id: "underline", label: "Under" },
        { id: "outline", label: "Outline" },
        { id: "off", label: "Off" },
      ] as const,
      (v) => setCs({ style: v }),
      ["cursor"],
    ),
    link(
      "l.caretWidth",
      "Caret thickness and corners",
      "Open the caret settings",
      "Caret",
      "/customise/typing#caret",
      "Typing · Caret",
      ["cursor", "thickness", "width", "radius"],
    ),
    enumEntry(
      "c.blink",
      "Caret blink",
      "How fast the caret blinks, or Off to keep it still",
      "Caret",
      blinkId(cs.blinkSpeed),
      BLINK.map(({ id, label }) => ({ id, label })),
      (v) => setCs({ blinkSpeed: BLINK.find((p) => p.id === v)?.ms ?? 0 }),
      ["cursor", "blink"],
    ),
    enumEntry(
      "c.smooth",
      "Caret movement",
      "How the caret glides from letter to letter",
      "Caret",
      movementId(cs.smoothSpeed),
      MOVEMENT.map(({ id, label }) => ({ id, label })),
      (v) => setCs({ smoothSpeed: MOVEMENT.find((p) => p.id === v)?.ms ?? 0 }),
      ["cursor", "motion", "smooth"],
    ),
    toggle(
      "a.caretIdle",
      "Pulse caret before you start",
      "Gently pulse the caret until your first keystroke",
      "Caret",
      ap.caretIdle === "pulse",
      (v) => setAp("caretIdle", v ? "pulse" : "off"),
      ["cursor", "idle"],
    ),

    /* ─── Typing area ──────────────────────────────────────────── */
    enumEntry(
      "a.highlightMode",
      "Highlight",
      "What gets marked as you move through the text",
      "Appearance",
      ap.highlightMode,
      [
        { id: "off", label: "Off" },
        { id: "letter", label: "Letter" },
        { id: "word", label: "Word" },
        { id: "next-word", label: "Next word" },
        { id: "next-letter", label: "Next letter" },
      ] as const,
      (v) => setAp("highlightMode", v),
      ["passage", "emphasis"],
    ),
    enumEntry(
      "a.typedEffect",
      "Typed words",
      "How words look once you've typed them",
      "Appearance",
      ap.typedEffect,
      [
        { id: "off", label: "Off" },
        { id: "fade", label: "Fade" },
        { id: "strike", label: "Strike" },
      ] as const,
      (v) => setAp("typedEffect", v),
      ["passage"],
    ),
    enumEntry(
      "a.mistakeStyle",
      "Mistakes",
      "How a wrong letter in the current word is marked",
      "Appearance",
      ap.mistakeStyle,
      [
        { id: "color", label: "Colour" },
        { id: "bold", label: "Bold" },
        { id: "underline", label: "Underline" },
        { id: "highlight", label: "Highlight" },
      ] as const,
      (v) => setAp("mistakeStyle", v),
      ["errors", "mistake", "feedback"],
    ),
    toggle(
      "a.markIncompleteWord",
      "Mark skipped words",
      "Underline a word you leave before finishing it",
      "Appearance",
      ap.markIncompleteWord,
      (v) => setAp("markIncompleteWord", v),
      ["errors", "skipped"],
    ),
    link(
      "l.typingArea",
      "Lines shown and line width",
      "Open the typing area settings",
      "Appearance",
      "/customise/typing#typing-area",
      "Typing · Typing area",
      ["lines", "width", "typing area"],
    ),
    enumEntry(
      "a.quoteAttribution",
      "Quote credit",
      "Where the author shows in quote mode",
      "Appearance",
      ap.quoteAttribution,
      [
        { id: "below", label: "Below" },
        { id: "chip", label: "Badge" },
        { id: "hidden", label: "Hidden" },
      ] as const,
      (v) => setAp("quoteAttribution", v),
      ["quote", "author"],
    ),
    enumEntry(
      "a.tapeMode",
      "Tape",
      "Show one scrolling line instead of a block of text",
      "Appearance",
      ap.tapeMode,
      [
        { id: "off", label: "Off" },
        { id: "word", label: "Word" },
        { id: "letter", label: "Letter" },
      ] as const,
      (v) => setAp("tapeMode", v),
      ["passage", "tape", "scroll"],
    ),
    toggle(
      "a.smoothLineScroll",
      "Smooth scrolling",
      "Glide to the next line instead of jumping",
      "Appearance",
      ap.smoothLineScroll,
      (v) => setAp("smoothLineScroll", v),
      ["passage", "scroll"],
    ),
  ];
}
