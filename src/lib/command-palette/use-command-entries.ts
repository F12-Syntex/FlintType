"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useAudioPrefs } from "@/lib/audio-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { usePalette } from "@/lib/themes/use-palette";
import type {
  CommandEntry,
  EnumEntry,
  LinkEntry,
  ToggleEntry,
} from "./types";

/* ─── Helpers ─────────────────────────────────────────────────────── */

function toggle(
  id: string,
  label: string,
  hint: string,
  group: ToggleEntry["group"],
  value: boolean,
  set: (next: boolean) => void,
  keywords?: readonly string[],
): ToggleEntry {
  return { id, label, hint, group, kind: "toggle", value, set, keywords };
}

function enumEntry<T extends string>(
  id: string,
  label: string,
  hint: string,
  group: EnumEntry["group"],
  value: T,
  options: readonly { id: T; label: string }[],
  set: (next: T) => void,
  keywords?: readonly string[],
): EnumEntry {
  // The underlying EnumEntry type widens id/value/set to `string` so
  // the discriminated union stays simple. The helper preserves
  // narrowness at the call site (caller passes a T-narrow `set` and
  // option list) and the cast below is the single boundary where it
  // widens.
  return {
    id,
    label,
    hint,
    group,
    kind: "enum",
    value,
    options,
    set: set as (next: string) => void,
    keywords,
  };
}

function link(
  id: string,
  label: string,
  hint: string,
  group: LinkEntry["group"],
  href: string,
  destination: string,
  keywords?: readonly string[],
): LinkEntry {
  return { id, label, hint, group, kind: "link", href, destination, keywords };
}

/* ─── Settings pages ──────────────────────────────────────────────── */

/** One "Go to … settings" entry per settings page. Kept in step with
 *  the page catalog in src/app/customise/_components/groups.ts. */
const SETTINGS_PAGES: readonly {
  id: string;
  name: string;
  href: string;
  hint: string;
  keywords: readonly string[];
}[] = [
  { id: "theme", name: "Theme", href: "/customise/theme", hint: "Palette, mode, colours, background image", keywords: ["palette", "colour", "color", "dark", "light"] },
  { id: "typing", name: "Typing", href: "/customise/typing", hint: "Font, caret, tape mode, mistakes", keywords: ["font", "caret", "tape", "passage"] },
  { id: "interface", name: "Interface", href: "/customise/interface", hint: "Style, surfaces, corners, top bar and footer", keywords: ["minimal", "chrome", "radius", "borders", "style", "font", "shadow"] },
  { id: "keyboard", name: "Keyboard", href: "/customise/keyboard", hint: "Practice keyboard and keymap layout", keywords: ["keymap", "layout", "qwerty", "dvorak", "colemak"] },
  { id: "stats", name: "Stats & results", href: "/customise/stats", hint: "Live numbers and the result screen", keywords: ["wpm", "accuracy", "result", "live"] },
  { id: "behaviour", name: "Behaviour", href: "/customise/behaviour", hint: "Mistakes, backspace, word lists, sound", keywords: ["behavior", "input", "sound", "burst"] },
  { id: "social", name: "Multiplayer & social", href: "/customise/social", hint: "Race visuals and live spectating", keywords: ["race", "multiplayer", "spectate", "friends"] },
];

/* ─── The hook ────────────────────────────────────────────────────── */

/** Build every command-palette entry from the project's live pref
 *  hooks. Re-runs only when the underlying prefs change.
 *
 *  Discipline:
 *    - One entry per user-facing setting. Toggles + enums render
 *      inline (Enter flips / expands). Sliders and colour pickers
 *      deep-link to /customise/<page>#<section> via a `link` entry — those
 *      controls don't fit a one-line keyboard-only flow.
 *    - The set of inline value options for an enum must come from the
 *      pref module's own option list where one exists, so any new
 *      option ships here automatically. */
export function useCommandEntries(): readonly CommandEntry[] {
  const router = useRouter();
  const { prefs: ap, update: setAp } = useAppearancePrefs();
  const { prefs: audio, update: setAudio } = useAudioPrefs();
  const { prefs: bp, update: setBp } = useBehaviourPrefs();
  const { settings: cs, update: setCs } = useCaretSettings();
  const { settings: ks, update: setKs } = useKeyboardSettings();
  const { themes, activeId: paletteId, apply: applyPalette } = usePalette();
  const { theme: mode, setTheme: setMode } = useNextTheme();

  return useMemo<readonly CommandEntry[]>(() => {
    const navigate = (href: string) => () => router.push(href);

    return [
      /* ─── Practice actions ─────────────────────────────────────── */
      {
        id: "p.restart",
        label: "Restart test",
        hint: "Bail and start a fresh run with the same mode + length",
        group: "Practice",
        kind: "action",
        // Dispatched on a global channel; the practice surface
        // (when mounted on /app or anywhere TypingSurface mounts)
        // subscribes and runs restart(). No-op on routes that
        // don't render the practice surface — harmless.
        run: () => {
          window.dispatchEvent(new CustomEvent("ft:practice:restart"));
        },
        keywords: ["reset", "tab", "again", "retry", "redo"],
      },

      /* ─── Mode (light / dark / system) ─────────────────────────── */
      enumEntry(
        "mode",
        "Mode",
        "Light, dark, or follow system",
        "Mode",
        (mode ?? "system") as "light" | "dark" | "system",
        [
          { id: "light", label: "Light" },
          { id: "dark", label: "Dark" },
          { id: "system", label: "System" },
        ] as const,
        (next) => setMode(next),
        ["theme", "appearance", "light", "dark", "system"],
      ),

      /* ─── Theme palette ────────────────────────────────────────── */
      enumEntry(
        "palette",
        "Theme palette",
        "Switch the community palette",
        "Theme",
        (paletteId ?? "default") as string,
        themes.map((t) => ({ id: t.id, label: t.name })),
        (next) => applyPalette(next),
        ["theme", "palette", "colours", "colors"],
      ),

      /* ─── Behaviour ────────────────────────────────────────────── */
      toggle(
        "b.blindMode",
        "Blind mode",
        "Hide what you typed and your speed until the end",
        "Behaviour",
        bp.blindMode,
        (v) => setBp("blindMode", v),
        ["practice", "blind", "feedback"],
      ),
      toggle(
        "b.stopOnError",
        "Stop on error",
        "Don't move on until a wrong letter is fixed",
        "Behaviour",
        bp.stopOnError,
        (v) => setBp("stopOnError", v),
        ["practice", "errors", "strict"],
      ),
      toggle(
        "b.allowExtras",
        "Allow extra letters",
        "Count letters typed past the end of a word",
        "Behaviour",
        bp.allowExtras,
        (v) => setBp("allowExtras", v),
        ["practice", "extras"],
      ),
      toggle(
        "b.strictSpace",
        "Strict space",
        "Space only moves on once the word is correct",
        "Behaviour",
        bp.strictSpace,
        (v) => setBp("strictSpace", v),
        ["practice", "space", "monkeytype"],
      ),
      toggle(
        "b.showSecondary",
        "Numbers and punctuation",
        "Mix numbers and punctuation into word tests",
        "Behaviour",
        bp.showSecondary,
        (v) => setBp("showSecondary", v),
        ["hud", "readouts"],
      ),
      toggle(
        "b.excludeCasualFromAdapt",
        "Ignore casual runs in adaptive practice",
        "Casual tests don't change which weak spots practice targets",
        "Behaviour",
        bp.excludeCasualFromAdapt,
        (v) => setBp("excludeCasualFromAdapt", v),
        ["adaptive", "model"],
      ),
      enumEntry(
        "b.confidence",
        "Confidence mode",
        "Limit backspace to earlier words, or turn it off",
        "Behaviour",
        bp.confidence,
        [
          { id: "off", label: "Off" },
          { id: "word", label: "Word" },
          { id: "all", label: "All" },
        ] as const,
        (v) => setBp("confidence", v),
        ["backspace", "lock"],
      ),

      /* ─── Audio ────────────────────────────────────────────────── */
      toggle(
        "a.keypressClickEnabled",
        "Key click sound",
        "A short click on every keystroke",
        "Behaviour",
        audio.keypressClickEnabled,
        (v) => setAudio("keypressClickEnabled", v),
        ["audio", "sound", "click", "key", "typing"],
      ),
      link(
        "a.keypressClickVolume",
        "Key click volume",
        "Open the volume slider",
        "Behaviour",
        "/customise/behaviour#audio",
        "Settings → Behaviour → Sound",
        ["audio", "sound", "click", "volume"],
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
          { id: "underline", label: "Underline" },
          { id: "outline", label: "Outline" },
          { id: "off", label: "Off" },
        ] as const,
        (v) => setCs({ style: v }),
        ["cursor"],
      ),
      enumEntry(
        "c.blink",
        "Caret blink",
        "Pulse cadence; Off keeps the caret steady",
        "Caret",
        cs.blinkSpeed === 0
          ? "off"
          : cs.blinkSpeed <= 600
            ? "fast"
            : cs.blinkSpeed <= 1000
              ? "normal"
              : "slow",
        [
          { id: "off", label: "Off" },
          { id: "fast", label: "Fast" },
          { id: "normal", label: "Normal" },
          { id: "slow", label: "Slow" },
        ] as const,
        (v) =>
          setCs({
            // Same values as the Settings → Typing → Caret presets so
            // the matching option lights up there.
            blinkSpeed:
              v === "off" ? 0 : v === "fast" ? 500 : v === "normal" ? 1000 : 1500,
          }),
        ["cursor", "blink"],
      ),
      enumEntry(
        "c.smooth",
        "Caret motion",
        "How the caret glides between letters",
        "Caret",
        (
          [
            [0, "off"],
            [60, "snappy"],
            [120, "smooth"],
            [200, "flow"],
            [300, "glide"],
            [450, "drift"],
          ] as const
        ).reduce<"off" | "snappy" | "smooth" | "flow" | "glide" | "drift">(
          (best, [ms, id]) => (cs.smoothSpeed >= ms ? id : best),
          "off",
        ),
        [
          { id: "off", label: "Off" },
          { id: "snappy", label: "Snappy" },
          { id: "smooth", label: "Smooth" },
          { id: "flow", label: "Flow" },
          { id: "glide", label: "Glide" },
          { id: "drift", label: "Drift" },
        ] as const,
        (v) =>
          setCs({
            // Same values as the Settings → Typing → Caret presets.
            smoothSpeed: { off: 0, snappy: 60, smooth: 120, flow: 200, glide: 300, drift: 450 }[v],
          }),
        ["cursor", "motion"],
      ),

      /* ─── Keyboard widget ──────────────────────────────────────── */
      enumEntry(
        "k.design",
        "Keyboard design",
        "Solid, outline, ghost, lifted, or glass",
        "Keyboard",
        ks.design,
        [
          { id: "solid", label: "Solid" },
          { id: "outline", label: "Outline" },
          { id: "ghost", label: "Ghost" },
          { id: "lifted", label: "Lifted" },
          { id: "glass", label: "Glass" },
        ] as const,
        (v) => setKs({ design: v }),
        ["keyboard"],
      ),
      enumEntry(
        "k.shape",
        "Keyboard shape",
        "Corner radius preset for the keys",
        "Keyboard",
        ks.shape,
        [
          { id: "square", label: "Square" },
          { id: "rounded", label: "Rounded" },
          { id: "pill", label: "Pill" },
        ] as const,
        (v) => setKs({ shape: v }),
        ["keyboard", "shape"],
      ),
      toggle(
        "k.compact",
        "Practice keyboard: letters only",
        "Hide the number row, modifier keys and space bar",
        "Keyboard",
        ks.compact,
        (v) => setKs({ compact: v }),
        ["keyboard", "compact"],
      ),
      toggle(
        "k.highlightHomeRow",
        "Mark F and J",
        "Highlight the home-row keys",
        "Keyboard",
        ks.highlightHomeRow,
        (v) => setKs({ highlightHomeRow: v }),
        ["keyboard", "homerow", "pegs"],
      ),
      toggle(
        "k.showShiftLabels",
        "Shift symbols",
        "Show the small symbol above each number key",
        "Keyboard",
        ks.showShiftLabels,
        (v) => setKs({ showShiftLabels: v }),
        ["keyboard", "labels"],
      ),

      /* ─── Appearance — passage / mistakes / typing area ────────── */
      enumEntry(
        "a.mistakeStyle",
        "Mistakes",
        "How a wrong letter in the current word is marked",
        "Appearance",
        ap.mistakeStyle,
        [
          { id: "color", label: "Color" },
          { id: "bold", label: "Bold" },
          { id: "underline", label: "Underline" },
          { id: "highlight", label: "Highlight" },
        ] as const,
        (v) => setAp("mistakeStyle", v),
        ["errors", "mistake", "feedback"],
      ),
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
        "How words look once you have typed them",
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
      toggle(
        "a.markIncompleteWord",
        "Mark skipped words",
        "Underline a word you leave before finishing it",
        "Appearance",
        ap.markIncompleteWord,
        (v) => setAp("markIncompleteWord", v),
        ["errors", "skipped"],
      ),
      enumEntry(
        "a.tapeMode",
        "Tape mode",
        "One scrolling line instead of a block of text",
        "Appearance",
        ap.tapeMode,
        [
          { id: "off", label: "Off" },
          { id: "word", label: "Word" },
          { id: "letter", label: "Letter" },
        ] as const,
        (v) => setAp("tapeMode", v),
        ["passage", "tape"],
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
      enumEntry(
        "a.caretIdle",
        "Pulse caret before you start",
        "Gently pulse the caret until your first keystroke",
        "Appearance",
        ap.caretIdle,
        [
          { id: "off", label: "Off" },
          { id: "pulse", label: "Pulse" },
        ] as const,
        (v) => setAp("caretIdle", v),
        ["caret", "idle"],
      ),

      /* ─── Appearance — surface / chrome ────────────────────────── */
      enumEntry(
        "a.cardSurfaces",
        "Cards",
        "Solid, subtle or transparent cards",
        "Appearance",
        ap.cardSurfaces,
        [
          { id: "solid", label: "Solid" },
          { id: "subtle", label: "Subtle" },
          { id: "transparent", label: "Transparent" },
        ] as const,
        (v) => setAp("cardSurfaces", v),
        ["minimal", "monkeytype", "cards"],
      ),
      enumEntry(
        "a.dividers",
        "Dividers",
        "Lines between sections",
        "Appearance",
        ap.dividers,
        [
          { id: "hairline", label: "Hairline" },
          { id: "dotted", label: "Dotted" },
          { id: "hidden", label: "Hidden" },
        ] as const,
        (v) => setAp("dividers", v),
        ["minimal", "lines"],
      ),
      enumEntry(
        "a.pagePadding",
        "Page padding",
        "How much space surrounds each page",
        "Appearance",
        ap.pagePadding,
        [
          { id: "tight", label: "Tight" },
          { id: "comfortable", label: "Comfortable" },
          { id: "roomy", label: "Roomy" },
        ] as const,
        (v) => setAp("pagePadding", v),
        ["density", "spacing"],
      ),
      enumEntry(
        "a.backgroundFill",
        "Page colour",
        "Themed or a bare neutral",
        "Appearance",
        ap.backgroundFill,
        [
          { id: "paper", label: "Paper" },
          { id: "bare", label: "Bare" },
        ] as const,
        (v) => setAp("backgroundFill", v),
        ["background"],
      ),
      toggle(
        "a.monochromeChrome",
        "Single accent",
        "Keep hover tints neutral so only the accent stands out",
        "Appearance",
        ap.monochromeChrome,
        (v) => setAp("monochromeChrome", v),
        ["editorial", "minimal"],
      ),
      enumEntry(
        "a.topbarStyle",
        "Top bar",
        "Raised, flat or text only",
        "Appearance",
        ap.topbarStyle,
        [
          { id: "elevated", label: "Raised" },
          { id: "flat", label: "Flat" },
          { id: "text-only", label: "Text only" },
        ] as const,
        (v) => setAp("topbarStyle", v),
        ["chrome", "header"],
      ),
      enumEntry(
        "a.footerStyle",
        "Footer",
        "Visible, compact or hidden",
        "Appearance",
        ap.footerStyle,
        [
          { id: "visible", label: "Visible" },
          { id: "compact", label: "Compact" },
          { id: "hidden", label: "Hidden" },
        ] as const,
        (v) => setAp("footerStyle", v),
        ["chrome", "footer"],
      ),
      enumEntry(
        "a.autoHide",
        "Hide the top bar while typing",
        "Dim or fade the top bar and footer during a test",
        "Appearance",
        ap.autoHide,
        [
          { id: "off", label: "Off" },
          { id: "dim", label: "Dim" },
          { id: "fade", label: "Fade" },
        ] as const,
        (v) => setAp("autoHide", v),
        ["chrome", "focus"],
      ),
      enumEntry(
        "a.borders",
        "Outlines",
        "Strong, soft or hidden",
        "Appearance",
        ap.borders,
        [
          { id: "default", label: "Strong" },
          { id: "soft", label: "Soft" },
          { id: "hidden", label: "Hidden" },
        ] as const,
        (v) => setAp("borders", v),
        ["geometry", "borders"],
      ),

      /* ─── Appearance — style (shape, depth, glow, type) ────────── */
      enumEntry(
        "a.controlShape",
        "Button shape",
        "Pill, rounded or square buttons, chips and inputs",
        "Appearance",
        ap.controlShape,
        [
          { id: "pill", label: "Pill" },
          { id: "rounded", label: "Rounded" },
          { id: "square", label: "Square" },
        ] as const,
        (v) => setAp("controlShape", v),
        ["style", "radius", "corners", "round"],
      ),
      enumEntry(
        "a.depth",
        "Depth",
        "How far cards and menus lift off the page",
        "Appearance",
        ap.depth,
        [
          { id: "flat", label: "Flat" },
          { id: "soft", label: "Soft" },
          { id: "lifted", label: "Lifted" },
        ] as const,
        (v) => setAp("depth", v),
        ["style", "shadow", "elevation", "flat"],
      ),
      toggle(
        "a.buttonGlow",
        "Button glow",
        "A soft glow under the main button on each screen",
        "Appearance",
        ap.buttonGlow,
        (v) => setAp("buttonGlow", v),
        ["style", "shadow", "glow"],
      ),
      toggle(
        "a.pageAura",
        "Page glow",
        "A faint wash of your accent colour at the top of every page",
        "Appearance",
        ap.pageAura,
        (v) => setAp("pageAura", v),
        ["style", "aura", "gradient", "background"],
      ),
      enumEntry(
        "a.uiFont",
        "App font",
        "The typeface for menus and pages",
        "Appearance",
        ap.uiFont,
        [
          { id: "sans", label: "Sans" },
          { id: "mono", label: "Mono" },
          { id: "system", label: "System" },
        ] as const,
        (v) => setAp("uiFont", v),
        ["style", "font", "typeface", "interface"],
      ),
      enumEntry(
        "a.uiScale",
        "App size",
        "Make everything a little smaller or larger",
        "Appearance",
        ap.uiScale,
        [
          { id: "compact", label: "Compact" },
          { id: "default", label: "Default" },
          { id: "large", label: "Large" },
        ] as const,
        (v) => setAp("uiScale", v),
        ["style", "zoom", "scale", "text size", "density"],
      ),

      /* ─── Appearance — live stats / result ─────────────────────── */
      enumEntry(
        "a.typingSpeedUnit",
        "Speed unit",
        "WPM, CPM, WPS, CPS or WPH",
        "Appearance",
        ap.typingSpeedUnit,
        [
          { id: "wpm", label: "WPM" },
          { id: "cpm", label: "CPM" },
          { id: "wps", label: "WPS" },
          { id: "cps", label: "CPS" },
          { id: "wph", label: "WPH" },
        ] as const,
        (v) => setAp("typingSpeedUnit", v),
        ["stats", "unit"],
      ),
      toggle(
        "a.alwaysShowDecimal",
        "Always show decimals",
        "Show decimals without hovering",
        "Appearance",
        ap.alwaysShowDecimal,
        (v) => setAp("alwaysShowDecimal", v),
        ["stats"],
      ),
      toggle(
        "a.startGraphsAtZero",
        "Start graphs at zero",
        "Keep the result chart honest",
        "Appearance",
        ap.startGraphsAtZero,
        (v) => setAp("startGraphsAtZero", v),
        ["result", "chart"],
      ),
      toggle(
        "a.resultShowHeatmap",
        "Result: text heatmap",
        "The text you typed, tinted by speed",
        "Appearance",
        ap.resultShowHeatmap,
        (v) => setAp("resultShowHeatmap", v),
        ["result", "heatmap"],
      ),
      toggle(
        "a.resultShowExtras",
        "Result: run details",
        "Longest streak, words finished and pauses",
        "Appearance",
        ap.resultShowExtras,
        (v) => setAp("resultShowExtras", v),
        ["result"],
      ),
      toggle(
        "a.resultShowPerLetter",
        "Result: slowest letters",
        "The eight letters that took longest",
        "Appearance",
        ap.resultShowPerLetter,
        (v) => setAp("resultShowPerLetter", v),
        ["result"],
      ),
      toggle(
        "a.resultShowHandBalance",
        "Result: hand balance",
        "How the work split between your hands",
        "Appearance",
        ap.resultShowHandBalance,
        (v) => setAp("resultShowHandBalance", v),
        ["result"],
      ),

      /* ─── Appearance — keymap widget ───────────────────────────── */
      enumEntry(
        "a.keymap",
        "Keymap",
        "React lights the key you pressed; Next lights the key to press",
        "Appearance",
        ap.keymap,
        [
          { id: "off", label: "Off" },
          { id: "static", label: "Static" },
          { id: "react", label: "React" },
          { id: "next", label: "Next" },
        ] as const,
        (v) => setAp("keymap", v),
        ["keyboard", "keymap"],
      ),
      enumEntry(
        "a.keymapLegend",
        "Keymap labels",
        "Lower, upper, blank or dynamic",
        "Appearance",
        ap.keymapLegend,
        [
          { id: "lowercase", label: "Lowercase" },
          { id: "uppercase", label: "Uppercase" },
          { id: "blank", label: "Blank" },
          { id: "dynamic", label: "Dynamic" },
        ] as const,
        (v) => setAp("keymapLegend", v),
        ["keymap"],
      ),
      enumEntry(
        "a.keymapTopRow",
        "Keymap number row",
        "Always, auto or never",
        "Appearance",
        ap.keymapTopRow,
        [
          { id: "always", label: "Always" },
          { id: "layout", label: "Auto" },
          { id: "never", label: "Never" },
        ] as const,
        (v) => setAp("keymapTopRow", v),
        ["keymap"],
      ),
      toggle(
        "a.keymapCompact",
        "Keymap: letters only",
        "Hide modifier keys and the space bar",
        "Appearance",
        ap.keymapCompact,
        (v) => setAp("keymapCompact", v),
        ["keymap"],
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
        ["quote"],
      ),
      enumEntry(
        "a.keymapLayout",
        "Keyboard layout",
        "QWERTY, Dvorak or Colemak",
        "Keyboard",
        (ap.keymapLayout === "dvorak" || ap.keymapLayout === "colemak"
          ? ap.keymapLayout
          : "qwerty") as "qwerty" | "dvorak" | "colemak",
        [
          { id: "qwerty", label: "QWERTY" },
          { id: "dvorak", label: "Dvorak" },
          { id: "colemak", label: "Colemak" },
        ] as const,
        (v) => setAp("keymapLayout", v),
        ["keymap", "layout", "qwerty", "dvorak", "colemak"],
      ),
      enumEntry(
        "a.resultChrome",
        "Result layout",
        "Group the results into cards, or keep them plain",
        "Appearance",
        ap.resultChrome,
        [
          { id: "framed", label: "Cards" },
          { id: "spare", label: "Plain" },
        ] as const,
        (v) => setAp("resultChrome", v),
        ["result", "cards", "minimal"],
      ),

      /* ─── Appearance — multiplayer ─────────────────────────────── */
      toggle(
        "a.multiplayerPlayerColors",
        "Race: player colours",
        "Give each racer their own colour",
        "Appearance",
        ap.multiplayerPlayerColors,
        (v) => setAp("multiplayerPlayerColors", v),
        ["race", "multiplayer"],
      ),
      enumEntry(
        "a.multiplayerOpponentMarker",
        "Race: opponents in the text",
        "Show where other racers are inside the text",
        "Appearance",
        ap.multiplayerOpponentMarker,
        [
          { id: "off", label: "Off" },
          { id: "tint", label: "Tint" },
          { id: "text", label: "Text" },
        ] as const,
        (v) => setAp("multiplayerOpponentMarker", v),
        ["race", "multiplayer"],
      ),
      toggle(
        "a.multiplayerRaceFeed",
        "Race: feed",
        "A running log of joins, lead changes and finishes",
        "Appearance",
        ap.multiplayerRaceFeed,
        (v) => setAp("multiplayerRaceFeed", v),
        ["race", "multiplayer"],
      ),
      toggle(
        "a.multiplayerShowOpponentWpm",
        "Race: opponent speed",
        "Show each racer's live speed",
        "Appearance",
        ap.multiplayerShowOpponentWpm,
        (v) => setAp("multiplayerShowOpponentWpm", v),
        ["race", "multiplayer"],
      ),

      /* ─── Link-only entries (slider / colour controls) ─────────── */
      link(
        "l.typography",
        "Font",
        "Typeface, size and word spacing",
        "Appearance",
        "/customise/typing#typography",
        "Settings → Typing → Font",
        ["font", "type", "size"],
      ),
      link(
        "l.colors",
        "Colours",
        "Change single colours on top of your palette",
        "Appearance",
        "/customise/theme#colors",
        "Settings → Theme → Colours",
        ["color", "colour", "palette"],
      ),
      link(
        "l.background",
        "Background image",
        "Add an image behind the app",
        "Appearance",
        "/customise/theme#background",
        "Settings → Theme → Background",
        ["image", "wallpaper"],
      ),
      link(
        "l.liveStats",
        "Live stats colour and opacity",
        "Open Live stats",
        "Appearance",
        "/customise/stats#live-stats",
        "Settings → Stats & results",
        ["stats"],
      ),
      link(
        "l.typingArea",
        "Typing area",
        "Lines shown, line width and tape position",
        "Appearance",
        "/customise/typing#typing-area",
        "Settings → Typing → Typing area",
        ["lines", "width"],
      ),
      link(
        "l.caretWidth",
        "Caret thickness and corners",
        "Open Caret",
        "Caret",
        "/customise/typing#caret",
        "Settings → Typing → Caret",
        ["cursor", "thickness"],
      ),

      /* ─── Navigate ─────────────────────────────────────────────── */
      {
        id: "nav.app",
        label: "Go to test",
        hint: "Open the practice surface",
        group: "Navigate",
        kind: "action",
        // The practice surface is at "/" (route was flattened from
        // /app/* → /*); "/app" 404s (#49 / FT-014).
        run: navigate("/"),
        keywords: ["practice", "type", "test"],
      },
      {
        id: "nav.customise",
        label: "Settings",
        hint: "Open settings",
        group: "Navigate",
        kind: "action",
        run: navigate("/customise"),
        keywords: ["settings", "customise", "preferences", "options"],
      },
      ...SETTINGS_PAGES.map(
        (p): CommandEntry => ({
          id: `nav.settings.${p.id}`,
          label: `${p.name} settings`,
          hint: p.hint,
          group: "Navigate",
          kind: "action",
          run: navigate(p.href),
          keywords: ["settings", "customise", ...p.keywords],
        }),
      ),
      {
        id: "nav.leaderboard",
        label: "Leaderboard",
        hint: "Top runs across the community",
        group: "Navigate",
        kind: "action",
        run: navigate("/leaderboard"),
        keywords: ["leaderboard", "rankings"],
      },
      {
        id: "nav.profile",
        label: "Your profile",
        hint: "PBs, history, settings",
        group: "Navigate",
        kind: "action",
        run: navigate("/profile"),
        keywords: ["profile", "account"],
      },
    ];
  }, [
    router,
    mode,
    setMode,
    paletteId,
    themes,
    applyPalette,
    ap,
    setAp,
    audio,
    setAudio,
    bp,
    setBp,
    cs,
    setCs,
    ks,
    setKs,
  ]);
}
