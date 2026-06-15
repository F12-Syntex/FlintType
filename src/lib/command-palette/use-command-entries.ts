"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useAudioPrefs } from "@/lib/audio-prefs";
import { useBehaviourPrefs } from "@/lib/behaviour-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
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

/* ─── The hook ────────────────────────────────────────────────────── */

/** Build every command-palette entry from the project's live pref
 *  hooks. Re-runs only when the underlying prefs change.
 *
 *  Discipline:
 *    - One entry per user-facing setting. Toggles + enums render
 *      inline (Enter flips / expands). Sliders and colour pickers
 *      deep-link to /customise#<section> via a `link` entry — those
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
  const {
    themes,
    activeId: paletteId,
    apply: applyPalette,
    reset: resetPalette,
  } = usePalette();
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
        // activeId is null on the Default palette and CUSTOM_THEME_ID once
        // the user has overridden any single value — map both to a real
        // option id so the current state always reads as selected.
        (paletteId ?? "default") as string,
        [
          // Default isn't a `themes` entry (it's activeId === null), so
          // prepend it explicitly — otherwise there's no row back to it.
          { id: "default", label: "Default" },
          ...themes.map((t) => ({ id: t.id, label: t.name })),
          // Surface "Custom" only while it's the active state, so it reads
          // as current. You can't switch *to* custom (it's a side effect of
          // overriding a value), so re-selecting it is a harmless no-op.
          ...(paletteId === CUSTOM_THEME_ID
            ? [{ id: CUSTOM_THEME_ID, label: "Custom" }]
            : []),
        ],
        (next) => (next === "default" ? resetPalette() : applyPalette(next)),
        ["theme", "palette", "colours", "colors", "default", "custom"],
      ),

      /* ─── Behaviour ────────────────────────────────────────────── */
      toggle(
        "b.blindMode",
        "Blind mode",
        "Hide right/wrong colouring while you type",
        "Behaviour",
        bp.blindMode,
        (v) => setBp("blindMode", v),
        ["practice", "blind", "feedback"],
      ),
      toggle(
        "b.stopOnError",
        "Stop on error",
        "Refuse to advance past a wrong letter",
        "Behaviour",
        bp.stopOnError,
        (v) => setBp("stopOnError", v),
        ["practice", "errors", "strict"],
      ),
      toggle(
        "b.allowExtras",
        "Allow extras",
        "Record letters typed past the end of a word",
        "Behaviour",
        bp.allowExtras,
        (v) => setBp("allowExtras", v),
        ["practice", "extras"],
      ),
      toggle(
        "b.strictSpace",
        "Strict space",
        "Refuse space until the word is complete",
        "Behaviour",
        bp.strictSpace,
        (v) => setBp("strictSpace", v),
        ["practice", "space", "monkeytype"],
      ),
      toggle(
        "b.showSecondary",
        "Show secondary HUD",
        "Extra readouts beside the main strip",
        "Behaviour",
        bp.showSecondary,
        (v) => setBp("showSecondary", v),
        ["hud", "readouts"],
      ),
      toggle(
        "b.excludeCasualFromAdapt",
        "Exclude casual runs from adaptive model",
        "Casual tests stop feeding the bigram / motor models",
        "Behaviour",
        bp.excludeCasualFromAdapt,
        (v) => setBp("excludeCasualFromAdapt", v),
        ["adaptive", "model"],
      ),
      enumEntry(
        "b.confidence",
        "Confidence",
        "Lock backspace at word boundaries",
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
        "Keypress click sound",
        "Short synthesized click on every keystroke",
        "Behaviour",
        audio.keypressClickEnabled,
        (v) => setAudio("keypressClickEnabled", v),
        ["audio", "sound", "click", "key", "typing"],
      ),
      link(
        "a.keypressClickVolume",
        "Click volume",
        "Adjust the click volume slider",
        "Behaviour",
        "/customise/behaviour#audio",
        "Slider on Customise → Audio",
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
            blinkSpeed:
              v === "off" ? 0 : v === "fast" ? 500 : v === "normal" ? 900 : 1300,
          }),
        ["cursor", "blink"],
      ),
      enumEntry(
        "c.smooth",
        "Caret motion",
        "How quickly the caret slides between letters",
        "Caret",
        cs.smoothSpeed === 0
          ? "instant"
          : cs.smoothSpeed <= 140
            ? "snap"
            : cs.smoothSpeed <= 260
              ? "smooth"
              : "flow",
        [
          { id: "instant", label: "Instant" },
          { id: "snap", label: "Snap" },
          { id: "smooth", label: "Smooth" },
          { id: "flow", label: "Flow" },
        ] as const,
        (v) =>
          setCs({
            smoothSpeed:
              v === "instant" ? 0 : v === "snap" ? 120 : v === "smooth" ? 220 : 360,
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
        "Compact keyboard",
        "Drop modifier rows; letters only",
        "Keyboard",
        ks.compact,
        (v) => setKs({ compact: v }),
        ["keyboard", "compact"],
      ),
      toggle(
        "k.highlightHomeRow",
        "Highlight home row",
        "F + J pegs stay lit so hands stay located",
        "Keyboard",
        ks.highlightHomeRow,
        (v) => setKs({ highlightHomeRow: v }),
        ["keyboard", "homerow", "pegs"],
      ),
      toggle(
        "k.showShiftLabels",
        "Show shift labels",
        "Render the small upper-case glyph on each key",
        "Keyboard",
        ks.showShiftLabels,
        (v) => setKs({ showShiftLabels: v }),
        ["keyboard", "labels"],
      ),

      /* ─── Appearance — passage / mistakes / typing area ────────── */
      enumEntry(
        "a.mistakeStyle",
        "Active mistake",
        "How a mistyped letter in the current word is marked",
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
        "Highlight mode",
        "What gets emphasised as you type",
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
        "Typed effect",
        "How past words look after you finish them",
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
        "Mark incomplete words",
        "Underline a word in red when you skip it",
        "Appearance",
        ap.markIncompleteWord,
        (v) => setAp("markIncompleteWord", v),
        ["errors", "skipped"],
      ),
      enumEntry(
        "a.tapeMode",
        "Tape mode",
        "One scrolling line vs. wrapped multi-line",
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
        "Smooth line scroll",
        "Animate line jumps instead of teleporting",
        "Appearance",
        ap.smoothLineScroll,
        (v) => setAp("smoothLineScroll", v),
        ["passage", "scroll"],
      ),
      enumEntry(
        "a.caretIdle",
        "Idle caret pulse",
        "Soft pulse before the test starts",
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
        "Card surfaces",
        "Solid, subtle, or transparent panel fills",
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
        "Inter-section divider style",
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
        "Global page padding density",
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
        "Background fill",
        "Themed paper or bare neutral",
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
        "Monochrome chrome",
        "Collapse accent into muted; primary stays the only spark",
        "Appearance",
        ap.monochromeChrome,
        (v) => setAp("monochromeChrome", v),
        ["editorial", "minimal"],
      ),
      enumEntry(
        "a.topbarStyle",
        "Topbar style",
        "Elevated, flat, or text-only header",
        "Appearance",
        ap.topbarStyle,
        [
          { id: "elevated", label: "Elevated" },
          { id: "flat", label: "Flat" },
          { id: "text-only", label: "Text only" },
        ] as const,
        (v) => setAp("topbarStyle", v),
        ["chrome", "header"],
      ),
      enumEntry(
        "a.footerStyle",
        "Footer style",
        "Visible, compact, or hidden footer",
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
        "Auto-hide chrome during a run",
        "Dim or fade chrome while you're typing",
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
        "Borders",
        "Default, soft (hairline), or hidden",
        "Appearance",
        ap.borders,
        [
          { id: "default", label: "Default" },
          { id: "soft", label: "Soft" },
          { id: "hidden", label: "Hidden" },
        ] as const,
        (v) => setAp("borders", v),
        ["geometry"],
      ),

      /* ─── Appearance — live stats / result ─────────────────────── */
      enumEntry(
        "a.typingSpeedUnit",
        "Typing speed unit",
        "WPM, CPM, WPS, CPS, or WPH",
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
        "Always show decimal",
        "Display fractional WPM in live stats",
        "Appearance",
        ap.alwaysShowDecimal,
        (v) => setAp("alwaysShowDecimal", v),
        ["stats"],
      ),
      toggle(
        "a.startGraphsAtZero",
        "Start graphs at zero",
        "Anchor the y-axis on the result chart",
        "Appearance",
        ap.startGraphsAtZero,
        (v) => setAp("startGraphsAtZero", v),
        ["result", "chart"],
      ),
      toggle(
        "a.resultShowHeatmap",
        "Result: show heatmap",
        "Per-key error / speed heatmap on the result screen",
        "Appearance",
        ap.resultShowHeatmap,
        (v) => setAp("resultShowHeatmap", v),
        ["result", "heatmap"],
      ),
      toggle(
        "a.resultShowExtras",
        "Result: show extras",
        "Extras / corrections panel on the result screen",
        "Appearance",
        ap.resultShowExtras,
        (v) => setAp("resultShowExtras", v),
        ["result"],
      ),
      toggle(
        "a.resultShowPerLetter",
        "Result: show per-letter",
        "Per-letter accuracy breakdown",
        "Appearance",
        ap.resultShowPerLetter,
        (v) => setAp("resultShowPerLetter", v),
        ["result"],
      ),
      toggle(
        "a.resultShowHandBalance",
        "Result: show hand balance",
        "Left / right keystroke distribution",
        "Appearance",
        ap.resultShowHandBalance,
        (v) => setAp("resultShowHandBalance", v),
        ["result"],
      ),

      /* ─── Appearance — keymap widget ───────────────────────────── */
      enumEntry(
        "a.keymap",
        "Keymap",
        "How the live keyboard reacts during a test",
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
        "Keymap legend",
        "Letter case shown on each key",
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
        "Keymap top row",
        "Render the number row above the alpha grid",
        "Appearance",
        ap.keymapTopRow,
        [
          { id: "always", label: "Always" },
          { id: "layout", label: "Layout" },
          { id: "never", label: "Never" },
        ] as const,
        (v) => setAp("keymapTopRow", v),
        ["keymap"],
      ),
      toggle(
        "a.keymapCompact",
        "Compact keymap",
        "Drop modifiers from the keymap row under the passage",
        "Appearance",
        ap.keymapCompact,
        (v) => setAp("keymapCompact", v),
        ["keymap"],
      ),
      enumEntry(
        "a.quoteAttribution",
        "Quote attribution",
        "Where the quote source line sits",
        "Appearance",
        ap.quoteAttribution,
        [
          { id: "below", label: "Below" },
          { id: "chip", label: "Chip" },
          { id: "hidden", label: "Hidden" },
        ] as const,
        (v) => setAp("quoteAttribution", v),
        ["quote"],
      ),

      /* ─── Appearance — multiplayer ─────────────────────────────── */
      toggle(
        "a.multiplayerPlayerColors",
        "Race: player colours",
        "Paint each racer in their own chart-palette colour",
        "Appearance",
        ap.multiplayerPlayerColors,
        (v) => setAp("multiplayerPlayerColors", v),
        ["race", "multiplayer"],
      ),
      enumEntry(
        "a.multiplayerOpponentMarker",
        "Race: opponent marker",
        "How opponents are marked inside the passage",
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
        "Chronological feed of joins / leader changes / finishes",
        "Appearance",
        ap.multiplayerRaceFeed,
        (v) => setAp("multiplayerRaceFeed", v),
        ["race", "multiplayer"],
      ),
      toggle(
        "a.multiplayerShowOpponentWpm",
        "Race: opponent WPM",
        "Show each racer's live WPM in their lane",
        "Appearance",
        ap.multiplayerShowOpponentWpm,
        (v) => setAp("multiplayerShowOpponentWpm", v),
        ["race", "multiplayer"],
      ),

      /* ─── Link-only entries (slider / colour controls) ─────────── */
      link(
        "l.typography",
        "Typography",
        "Font family, size, word spacing — open the full picker",
        "Appearance",
        "/customise/appearance#typography",
        "Customise → Typography",
        ["font", "type", "size"],
      ),
      link(
        "l.colors",
        "Colours",
        "Override every palette token by hex — open Colours",
        "Appearance",
        "/customise/appearance#colors",
        "Customise → Colours",
        ["color", "colour", "palette"],
      ),
      link(
        "l.background",
        "Background image",
        "Drop an image, fit, opacity — open Background",
        "Appearance",
        "/customise/appearance#background",
        "Customise → Background",
        ["image", "wallpaper"],
      ),
      link(
        "l.liveStats",
        "Live stats colour & opacity",
        "Colour + opacity sliders — open Live stats",
        "Appearance",
        "/customise/appearance#live-stats",
        "Customise → Live stats",
        ["stats"],
      ),
      link(
        "l.typingArea",
        "Typing area dimensions",
        "Max line width, lines rendered, tape margin",
        "Appearance",
        "/customise/appearance#typing-area",
        "Customise → Typing area",
        ["lines", "width"],
      ),
      link(
        "l.caretWidth",
        "Caret thickness & radius",
        "Width / radius sliders — open Caret",
        "Caret",
        "/customise/appearance#caret",
        "Customise → Caret",
        ["cursor", "thickness"],
      ),

      /* ─── Navigate ─────────────────────────────────────────────── */
      {
        id: "nav.app",
        label: "Go to test",
        hint: "Open the practice surface",
        group: "Navigate",
        kind: "action",
        run: navigate("/app"),
        keywords: ["practice", "type", "test"],
      },
      {
        id: "nav.customise",
        label: "Customise",
        hint: "Open the full customisation page",
        group: "Navigate",
        kind: "action",
        run: navigate("/customise/appearance"),
        keywords: ["settings"],
      },
      {
        id: "nav.behaviour",
        label: "Behaviour settings",
        hint: "Open Customise → Behaviour",
        group: "Navigate",
        kind: "action",
        run: navigate("/customise/behaviour"),
        keywords: ["behaviour", "settings"],
      },
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
    resetPalette,
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
