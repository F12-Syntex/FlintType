import { z } from "zod";

/** Shape validation for the live-screen "meta" block (appearance, caret,
 *  theme vars) carried on `live.progress`. The broadcaster reads these
 *  straight from its typed pref stores, so the wire schema mirrors the
 *  pref shapes — enums + bounded primitives — instead of accepting
 *  opaque blobs. Unknown keys are STRIPPED (zod object default) and a
 *  field with an invalid value degrades to `undefined` (the spectator's
 *  clone falls back to the default for just that field), so an old or
 *  drifted client never gets its whole push 400'd.
 *
 *  Keep the enums in sync with `src/lib/appearance-prefs.ts` and
 *  `src/lib/caret-settings.ts` — a new pref value must be added here in
 *  the same commit, or broadcasters using it will stream the default. */

/** An invalid value drops to `undefined` (clone uses its default)
 *  instead of rejecting the whole progress push. */
function lenient<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().catch(undefined);
}

/** The resolved CSS custom properties a broadcaster sends so the
 *  spectator's clone matches its colours + typography. Single source —
 *  the broadcaster reads exactly these from `<html>` at push time, and
 *  the wire schema strips everything else. */
export const CLONE_THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--destructive",
  "--destructive-foreground",
  "--ft-font-family",
  "--ft-font-scale",
  "--ft-word-spacing",
  "--ft-passage-typed",
  "--ft-passage-untyped",
  "--ft-passage-error",
] as const;

const CLONE_THEME_VAR_SET: ReadonlySet<string> = new Set(CLONE_THEME_VARS);

/** Accepts any bounded string record on the wire (old clients), keeps
 *  only the allowlisted vars. Output is a clean Record<string, string>. */
export const liveThemeVarsSchema = z
  .record(z.string().max(64), z.string().max(200))
  .transform((rec) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (CLONE_THEME_VAR_SET.has(k)) out[k] = v;
    }
    return out;
  });

const liveStatStyle = z.enum(["off", "text", "mini", "flash"]);

/** Partial mirror of `AppearancePrefs` (src/lib/appearance-prefs.ts).
 *  Every field optional — the broadcaster sends the full object, but a
 *  lean/old client may omit any; the clone merges over defaults. */
export const liveAppearanceSchema = z.object({
  liveProgressStyle: lenient(liveStatStyle),
  liveSpeedStyle: lenient(liveStatStyle),
  liveAccuracyStyle: lenient(liveStatStyle),
  liveBurstStyle: lenient(liveStatStyle),
  liveStatsColor: lenient(z.string().max(32)),
  liveStatsOpacity: lenient(z.number().min(0).max(1)),

  highlightMode: lenient(
    z.enum(["off", "letter", "word", "next-word", "next-letter"]),
  ),
  typedEffect: lenient(z.enum(["off", "fade", "strike"])),
  markIncompleteWord: lenient(z.boolean()),
  mistakeStyle: lenient(z.enum(["color", "bold", "underline", "highlight"])),

  tapeMode: lenient(z.enum(["off", "word", "letter"])),
  tapeMargin: lenient(z.number().min(0).max(100)),
  tapeFade: lenient(z.enum(["off", "soft", "strong"])),
  smoothLineScroll: lenient(z.boolean()),
  linesRendered: lenient(z.number().int().min(0).max(100)),
  maxLineWidth: lenient(z.number().int().min(0).max(500)),

  alwaysShowDecimal: lenient(z.boolean()),
  typingSpeedUnit: lenient(z.enum(["wpm", "cpm", "wps", "cps", "wph"])),
  startGraphsAtZero: lenient(z.boolean()),
  resultShowHeatmap: lenient(z.boolean()),
  resultShowExtras: lenient(z.boolean()),
  resultShowPerLetter: lenient(z.boolean()),
  resultShowHandBalance: lenient(z.boolean()),

  keymap: lenient(z.enum(["off", "static", "react", "next"])),
  keymapLayout: lenient(z.string().max(64)),
  keymapStyle: lenient(z.enum(["staggered", "matrix", "split", "alice"])),
  keymapLegend: lenient(z.enum(["lowercase", "uppercase", "blank", "dynamic"])),
  keymapTopRow: lenient(z.enum(["always", "layout", "never"])),
  keymapSize: lenient(z.number().min(0).max(5)),
  keymapCompact: lenient(z.boolean()),

  borders: lenient(z.enum(["default", "soft", "hidden"])),
  burstReps: lenient(z.number().int().min(1).max(10)),

  multiplayerPlayerColors: lenient(z.boolean()),
  multiplayerOpponentMarker: lenient(z.enum(["off", "tint", "text"])),
  multiplayerRaceFeed: lenient(z.boolean()),
  multiplayerShowOpponentWpm: lenient(z.boolean()),

  cardSurfaces: lenient(z.enum(["solid", "subtle", "transparent"])),
  dividers: lenient(z.enum(["hairline", "dotted", "hidden"])),
  pagePadding: lenient(z.enum(["comfortable", "tight", "roomy"])),
  backgroundFill: lenient(z.enum(["paper", "bare"])),
  topbarStyle: lenient(z.enum(["elevated", "flat", "text-only"])),
  footerStyle: lenient(z.enum(["visible", "compact", "hidden"])),
  autoHide: lenient(z.enum(["off", "dim", "fade"])),
  statStripSurface: lenient(z.enum(["card", "plain", "none"])),
  resultChrome: lenient(z.enum(["framed", "spare"])),
  caretIdle: lenient(z.enum(["off", "pulse"])),
  quoteAttribution: lenient(z.enum(["below", "chip", "hidden"])),
  monochromeChrome: lenient(z.boolean()),
});

/** Partial mirror of `CaretSettings` (src/lib/caret-settings.ts). */
export const liveCaretSchema = z.object({
  style: lenient(z.enum(["line", "block", "underline", "outline", "off"])),
  width: lenient(z.number().min(0).max(40)),
  radius: lenient(z.number().min(0).max(40)),
  blinkSpeed: lenient(z.number().min(0).max(10_000)),
  smoothSpeed: lenient(z.number().min(0).max(10_000)),
});

/** Schema-inferred shapes — the single source for `LiveScreen`'s meta
 *  fields, so the wire schema and the type can't drift. */
export type LiveAppearance = z.infer<typeof liveAppearanceSchema>;
export type LiveCaret = z.infer<typeof liveCaretSchema>;
export type LiveThemeVars = z.infer<typeof liveThemeVarsSchema>;
