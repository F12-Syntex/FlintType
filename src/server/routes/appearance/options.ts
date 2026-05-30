import type { AiChange, AppearancePatch } from "@/types/appearance-ai";
import { buildPalette, formatOklch } from "./color";

/** The AI never invents values. It picks an option **id** for each knob
 *  from this fixed catalog, and we resolve the id to a concrete patch.
 *  That keeps every suggestion on-brand and valid, and makes "change lots
 *  of things at once" reliable — the model just fills one object with
 *  enum ids. The resolved patch still passes through `sanitizePatch` as a
 *  final boundary. */

type OptionPatch = {
  theme?: Record<string, string>;
  appearance?: Record<string, string | number | boolean>;
  behaviour?: Record<string, string | number | boolean>;
};
type KnobOption = { id: string; label: string; patch: OptionPatch };
type Knob = { label: string; options: readonly KnobOption[] };

/* ── value builders ─────────────────────────────────────────────── */

const accent = (h: number): OptionPatch => {
  const v = formatOklch({ l: 0.63, c: 0.2, h });
  return { theme: { "--primary": v, "--ring": v } };
};

const SURFACE_ROLES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--accent",
  "--accent-foreground",
];
const surface = (h: number, dark: boolean): OptionPatch => ({
  theme: buildPalette({ l: 0.6, c: 0.04, h }, "monochrome", SURFACE_ROLES, dark),
});

const tvar = (k: string, v: string): OptionPatch => ({ theme: { [k]: v } });
const ap = (k: string, v: string | number | boolean): OptionPatch => ({
  appearance: { [k]: v },
});
const be = (k: string, v: string | number | boolean): OptionPatch => ({
  behaviour: { [k]: v },
});

const enumOpts = (
  key: string,
  bucket: "appearance" | "behaviour",
  pairs: readonly (readonly [string, string])[],
): KnobOption[] =>
  pairs.map(([id, label]) => ({
    id,
    label,
    patch: bucket === "appearance" ? ap(key, id) : be(key, id),
  }));

const boolOpts = (key: string, bucket: "appearance" | "behaviour"): KnobOption[] => [
  { id: "off", label: "Off", patch: bucket === "appearance" ? ap(key, false) : be(key, false) },
  { id: "on", label: "On", patch: bucket === "appearance" ? ap(key, true) : be(key, true) },
];

/* ── the catalog ────────────────────────────────────────────────── */

export const KNOBS: Record<string, Knob> = {
  accent: {
    label: "Accent",
    options: [
      { id: "coral", label: "Coral", patch: accent(35) },
      { id: "amber", label: "Amber", patch: accent(70) },
      { id: "gold", label: "Gold", patch: accent(95) },
      { id: "lime", label: "Lime", patch: accent(130) },
      { id: "green", label: "Green", patch: accent(150) },
      { id: "teal", label: "Teal", patch: accent(185) },
      { id: "sky", label: "Sky", patch: accent(220) },
      { id: "blue", label: "Blue", patch: accent(250) },
      { id: "indigo", label: "Indigo", patch: accent(275) },
      { id: "violet", label: "Violet", patch: accent(300) },
      { id: "pink", label: "Pink", patch: accent(345) },
      { id: "rose", label: "Rose", patch: accent(10) },
      { id: "red", label: "Red", patch: accent(25) },
    ],
  },
  surface: {
    label: "Surface",
    options: [
      { id: "paper", label: "Warm paper", patch: surface(85, false) },
      { id: "white", label: "Clean white", patch: surface(255, false) },
      { id: "sepia", label: "Sepia", patch: surface(70, false) },
      { id: "mint", label: "Mint", patch: surface(150, false) },
      { id: "sky", label: "Sky", patch: surface(220, false) },
      { id: "lavender", label: "Lavender", patch: surface(300, false) },
      { id: "slate", label: "Slate (dark)", patch: surface(250, true) },
      { id: "midnight", label: "Midnight (dark)", patch: surface(265, true) },
      { id: "charcoal", label: "Charcoal (dark)", patch: surface(60, true) },
      { id: "forest", label: "Forest (dark)", patch: surface(150, true) },
    ],
  },
  font: {
    label: "Font",
    options: [
      { id: "mono", label: "JetBrains Mono", patch: tvar("--ft-font-family", "'JetBrains Mono', monospace") },
      { id: "serif", label: "Georgia serif", patch: tvar("--ft-font-family", "'Georgia', serif") },
      { id: "elegant", label: "Garamond", patch: tvar("--ft-font-family", "'Garamond', 'Times New Roman', serif") },
      { id: "sans", label: "Helvetica", patch: tvar("--ft-font-family", "'Helvetica Neue', Arial, sans-serif") },
      { id: "typewriter", label: "Courier", patch: tvar("--ft-font-family", "'Courier New', monospace") },
      { id: "system", label: "System", patch: tvar("--ft-font-family", "system-ui, sans-serif") },
    ],
  },
  fontSize: {
    label: "Text size",
    options: [
      { id: "small", label: "Small", patch: tvar("--ft-font-scale", "0.85") },
      { id: "normal", label: "Normal", patch: tvar("--ft-font-scale", "1") },
      { id: "large", label: "Large", patch: tvar("--ft-font-scale", "1.3") },
      { id: "huge", label: "Huge", patch: tvar("--ft-font-scale", "1.7") },
    ],
  },
  radius: {
    label: "Corners",
    options: [
      { id: "sharp", label: "Sharp", patch: tvar("--radius", "0rem") },
      { id: "soft", label: "Soft", patch: tvar("--radius", "0.5rem") },
      { id: "round", label: "Round", patch: tvar("--radius", "1rem") },
    ],
  },
  wordSpacing: {
    label: "Word spacing",
    options: [
      { id: "tight", label: "Tight", patch: tvar("--ft-word-spacing", "0em") },
      { id: "normal", label: "Normal", patch: tvar("--ft-word-spacing", "0.25em") },
      { id: "wide", label: "Wide", patch: tvar("--ft-word-spacing", "0.5em") },
    ],
  },
  tape: { label: "Tape mode", options: enumOpts("tapeMode", "appearance", [["off", "Off"], ["word", "Word"], ["letter", "Letter"]]) },
  highlight: { label: "Highlight", options: enumOpts("highlightMode", "appearance", [["off", "Off"], ["letter", "Letter"], ["word", "Word"], ["next-word", "Next word"], ["next-letter", "Next letter"]]) },
  typedEffect: { label: "Typed effect", options: enumOpts("typedEffect", "appearance", [["off", "Off"], ["fade", "Fade"], ["strike", "Strike"]]) },
  mistakes: { label: "Mistakes", options: enumOpts("mistakeStyle", "appearance", [["color", "Colour"], ["bold", "Bold"], ["underline", "Underline"], ["highlight", "Highlight"]]) },
  caretIdle: { label: "Caret idle", options: enumOpts("caretIdle", "appearance", [["off", "Off"], ["pulse", "Pulse"]]) },
  cards: { label: "Card surfaces", options: enumOpts("cardSurfaces", "appearance", [["solid", "Solid"], ["subtle", "Subtle"], ["transparent", "Transparent"]]) },
  dividers: { label: "Dividers", options: enumOpts("dividers", "appearance", [["hairline", "Hairline"], ["dotted", "Dotted"], ["hidden", "Hidden"]]) },
  fill: { label: "Background fill", options: enumOpts("backgroundFill", "appearance", [["paper", "Paper"], ["bare", "Bare"]]) },
  padding: { label: "Page padding", options: enumOpts("pagePadding", "appearance", [["tight", "Tight"], ["comfortable", "Comfortable"], ["roomy", "Roomy"]]) },
  monochrome: { label: "Monochrome chrome", options: boolOpts("monochromeChrome", "appearance") },
  smoothScroll: { label: "Smooth scroll", options: boolOpts("smoothLineScroll", "appearance") },
  markIncomplete: { label: "Mark incomplete words", options: boolOpts("markIncompleteWord", "appearance") },
  lines: {
    label: "Lines shown",
    options: [
      { id: "compact", label: "Compact", patch: ap("linesRendered", 2) },
      { id: "default", label: "Default", patch: ap("linesRendered", 3) },
      { id: "tall", label: "Tall", patch: ap("linesRendered", 5) },
      { id: "all", label: "All", patch: ap("linesRendered", 0) },
    ],
  },
  width: {
    label: "Line width",
    options: [
      { id: "narrow", label: "Narrow", patch: ap("maxLineWidth", 60) },
      { id: "normal", label: "Normal", patch: ap("maxLineWidth", 80) },
      { id: "wide", label: "Wide", patch: ap("maxLineWidth", 100) },
      { id: "full", label: "Full", patch: ap("maxLineWidth", 0) },
    ],
  },
  quickRestart: { label: "Quick restart", options: boolOpts("quickRestart", "behaviour") },
  stopOnError: { label: "Stop on error", options: boolOpts("stopOnError", "behaviour") },
  confidence: { label: "Confidence", options: enumOpts("confidence", "behaviour", [["off", "Off"], ["word", "Per word"], ["all", "All"]]) },
  allowExtras: { label: "Allow extras", options: boolOpts("allowExtras", "behaviour") },
  strictSpace: { label: "Strict space", options: boolOpts("strictSpace", "behaviour") },
  blindMode: { label: "Blind mode", options: boolOpts("blindMode", "behaviour") },
};

/** One line per knob for the system prompt — kept in sync with the catalog
 *  automatically so the prompt can never drift from what's resolvable. */
export function describeCatalog(): string {
  return Object.entries(KNOBS)
    .map(([knob, def]) => `- ${knob}: ${def.options.map((o) => o.id).join(" | ")}`)
    .join("\n");
}

function emptyPatch(): AppearancePatch {
  return { theme: {}, appearance: {}, background: {}, behaviour: {} };
}

function applyOption(
  out: AppearancePatch,
  changes: AiChange[],
  knob: string,
  id: string,
): void {
  const def = KNOBS[knob];
  if (!def) return;
  const opt = def.options.find((o) => o.id === id);
  if (!opt) return;
  if (opt.patch.theme) Object.assign(out.theme, opt.patch.theme);
  if (opt.patch.appearance) Object.assign(out.appearance, opt.patch.appearance);
  if (opt.patch.behaviour) Object.assign(out.behaviour, opt.patch.behaviour);
  changes.push({ label: def.label, value: opt.label });
}

/** Resolve the model's `{ options, randomize }` reply into a concrete
 *  patch + change rows. Randomize runs first so explicit options win. */
export function resolveAi(obj: Record<string, unknown>): {
  patch: AppearancePatch;
  changes: AiChange[];
} {
  const out = emptyPatch();
  const changes: AiChange[] = [];

  if (Array.isArray(obj.randomize)) {
    for (const knob of obj.randomize) {
      if (typeof knob !== "string") continue;
      const def = KNOBS[knob];
      if (!def) continue;
      const pick = def.options[Math.floor(Math.random() * def.options.length)];
      applyOption(out, changes, knob, pick.id);
    }
  }

  if (obj.options && typeof obj.options === "object") {
    for (const [knob, choice] of Object.entries(
      obj.options as Record<string, unknown>,
    )) {
      const id =
        typeof choice === "boolean"
          ? choice
            ? "on"
            : "off"
          : typeof choice === "string"
            ? choice
            : null;
      if (id !== null) applyOption(out, changes, knob, id);
    }
  }

  return { patch: out, changes };
}
