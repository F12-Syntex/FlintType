"use client";

import { useCallback, useMemo } from "react";
import { usePrefsOverride } from "./prefs-override";
import { useRemotePrefs } from "./use-remote-prefs";

// ─── enums ────────────────────────────────────────────────────────────

export type LiveStatStyle = "off" | "text" | "mini" | "flash";
export type HighlightMode = "off" | "letter" | "word" | "next-word" | "next-letter";
export type TypedEffect = "off" | "fade" | "strike";
export type TapeMode = "off" | "word" | "letter";
export type TypingSpeedUnit = "wpm" | "cpm" | "wps" | "cps" | "wph";
export type Keymap = "off" | "static" | "react" | "next";
/** How an opponent's leading edge is marked inside the practice
 *  passage on the race screen.
 *    off  — no marking; the passage reads exactly like single-player
 *    tint — soft background band painted with a low-opacity wash of
 *           the slowest opponent's colour (legacy "highlight" mode)
 *    text — the *text* of words ahead of your cursor paints in the
 *           slowest opponent's colour, so opponent progress reads as
 *           coloured letters bleeding back toward you instead of a
 *           highlight band */
export type MultiplayerOpponentMarker = "off" | "tint" | "text";
export type KeymapStyle = "staggered" | "matrix" | "split" | "alice";
export type KeymapLegend = "lowercase" | "uppercase" | "blank" | "dynamic";
export type KeymapTopRow = "always" | "layout" | "never";
export type BordersMode = "default" | "soft" | "hidden";

// ─── Monkeytype-leaning minimisation knobs (see docs/ui-law.md §15) ──
export type CardSurfaceMode = "solid" | "subtle" | "transparent";
export type DividerMode = "hairline" | "dotted" | "hidden";
export type PagePaddingMode = "comfortable" | "tight" | "roomy";
export type BackgroundFillMode = "paper" | "bare";
export type TopbarStyle = "elevated" | "flat" | "text-only";
export type FooterStyle = "visible" | "compact" | "hidden";
export type AutoHideMode = "off" | "dim" | "fade";
export type ModeBarStyle = "chips" | "inline" | "hidden";
export type StatStripSurface = "card" | "plain" | "none";
export type ResultChrome = "framed" | "spare";
export type CaretIdle = "off" | "pulse";
export type QuoteAttribution = "below" | "chip" | "hidden";
/** How a mistyped (or extra) letter in the *active* word is marked.
 *  Every variant paints the letter in --ft-passage-error; the extra
 *  cue stacks on top so users can dial intensity from quiet (colour
 *  only) to loud (background highlight). Past errored words are
 *  governed separately by `markIncompleteWord`. */
export type MistakeStyle = "color" | "bold" | "underline" | "highlight";

// ─── shape ────────────────────────────────────────────────────────────

export type AppearancePrefs = {
  liveProgressStyle: LiveStatStyle;
  liveSpeedStyle: LiveStatStyle;
  liveAccuracyStyle: LiveStatStyle;
  liveBurstStyle: LiveStatStyle;
  /** Hex string or empty for "default" (theme primary). */
  liveStatsColor: string;
  /** 0–1. */
  liveStatsOpacity: number;

  highlightMode: HighlightMode;
  typedEffect: TypedEffect;
  /** When true, the practice passage marks a word as errored if the
   *  user pressed space before completing it — the word is added to
   *  errorWords and renders with the destructive underline. When
   *  false, the skip is silent: typed chars stay typed, untyped chars
   *  stay muted, no underline. The summary still counts the word as
   *  an error for accuracy purposes either way. */
  markIncompleteWord: boolean;
  /** How a mistyped (or extra) letter in the currently-active word is
   *  marked. See `MistakeStyle`. Defaults to `bold` — colour + weight
   *  bump reads unmissable without competing with the caret. */
  mistakeStyle: MistakeStyle;

  tapeMode: TapeMode;
  /** 0–100, percent from the left edge of the typing area. */
  tapeMargin: number;
  smoothLineScroll: boolean;
  /** Maximum lines rendered in the passage. `0` means unbounded —
   *  show every line that fits in the available height. Otherwise
   *  the passage is clipped to `min(linesRendered, fits)` whole
   *  lines. Default `3`, mirroring the original cap. */
  linesRendered: number;
  /** Width in characters; 0 = align to content edges. */
  maxLineWidth: number;

  alwaysShowDecimal: boolean;
  typingSpeedUnit: TypingSpeedUnit;
  startGraphsAtZero: boolean;
  /** Result-screen sections — each is a small visualisation derived
   *  from the run's keystroke stream + per-second wpm samples. Off
   *  collapses the section, leaving the chart + stats strip + heatmap
   *  intact so the screen stays useful even at minimum density. */
  resultShowHeatmap: boolean;
  resultShowExtras: boolean;
  resultShowPerLetter: boolean;
  resultShowHandBalance: boolean;

  keymap: Keymap;
  keymapLayout: string;
  keymapStyle: KeymapStyle;
  keymapLegend: KeymapLegend;
  keymapTopRow: KeymapTopRow;
  /** 0.5–3.5. */
  keymapSize: number;
  /** When true, the keymap drops modifier keys (Tab, Caps, Shift, Ctrl,
   *  Alt, Meta, Enter, Backspace, Space) and renders only the letter /
   *  symbol grid. Useful when the keymap sits under the passage and a
   *  full-width row would push the typing area off-screen. Independent
   *  from the keyboard widget's own `compact` setting (under Keyboard),
   *  because the keymap and the practice keyboard are two separate
   *  rendered surfaces with different sizing budgets. */
  keymapCompact: boolean;

  /** Global border visibility — `soft` thins every hairline to a
   *  10%-foreground tint, `hidden` makes them transparent everywhere
   *  (themes pages, settings rows, popovers, buttons). Read by the
   *  global rule in globals.css that targets `html[data-ft-borders]`. */
  borders: BordersMode;

  /** Consecutive successful bursts required to advance to the next
   *  item in a burst drill. Pangrams ignore this (they're whole
   *  sentences and 1 rep is enough); every other burst (burst-1000,
   *  top-100 sprint, trigram burst) honours it. Range 1–10. */
  burstReps: number;

  /** Multiplayer — race surface only. When true, each racer's lane
   *  + position marker paints in their own colour pulled from the
   *  --chart-* palette so opponents are visually distinct. Default
   *  off to keep the single-accent baseline (§2). */
  multiplayerPlayerColors: boolean;
  /** How an opponent's progress is marked *inside* the practice
   *  passage. `text` (default) paints the letters of upcoming words
   *  in the slowest opponent's colour so opponents read as a
   *  coloured tide bleeding back toward you; `tint` falls back to
   *  the original soft background band; `off` hides the marker
   *  entirely. Honoured only when player colours are on. */
  multiplayerOpponentMarker: MultiplayerOpponentMarker;
  /** Bring back the chronological race feed (joins / leader
   *  changes / milestones / finishes) in the side panel. */
  multiplayerRaceFeed: boolean;
  /** Show each opponent's live WPM number in their lane row.
   *  Off keeps the lanes minimal and shifts the focus to the bars. */
  multiplayerShowOpponentWpm: boolean;

  // ─── Surface (Monkeytype-leaning minimisation) ───
  /** Global card-fill mode. `solid` paints --card/--popover/--muted as
   *  themed fills (current). `subtle` drops them to 40% alpha of the
   *  page bg so they read as faint washes. `transparent` makes every
   *  card surface clear — pairs with borders:hidden for the
   *  unframed Monkeytype look. Mirrored onto html[data-ft-cards]. */
  cardSurfaces: CardSurfaceMode;
  /** Inter-section divider lines (settings page breaks, topbar bottom
   *  border, footer top border). Independent of card outlines (those
   *  live on `borders`). Mirrored onto html[data-ft-dividers]. */
  dividers: DividerMode;
  /** Global multiplier on page-level padding from §3. `tight` reads
   *  utility / keyboard-first; `roomy` reads editorial.
   *  Mirrored onto html[data-ft-padding]. */
  pagePadding: PagePaddingMode;
  /** `paper` keeps the themed --background; `bare` overrides it to a
   *  near-white / near-black neutral so the typing area dominates.
   *  Mirrored onto html[data-ft-bg-fill]. */
  backgroundFill: BackgroundFillMode;

  // ─── Chrome (gets out of the way) ───
  /** Topbar visual style. `elevated` is current backdrop-blur + border;
   *  `flat` drops bg + border (links float on page bg); `text-only`
   *  reduces to the bare minimum — logo + links, no chrome strip.
   *  Mirrored onto html[data-ft-topbar]. */
  topbarStyle: TopbarStyle;
  /** Marketing footer visibility. `compact` keeps a single-line strip;
   *  `hidden` removes it from chrome routes that opt in.
   *  Mirrored onto html[data-ft-footer]. */
  footerStyle: FooterStyle;
  /** When the user is mid-run, fade chrome (topbar/footer/sidebar) so
   *  the passage owns the screen. Restored on Esc / restart / done.
   *  Mirrored onto html[data-ft-autohide]; pairs with html[data-ft-running]
   *  set by AutoHideApplier reading PracticeContext. */
  autoHide: AutoHideMode;
  /** Mode bar on the practice surface. `inline` collapses chips to
   *  middot-separated text; `hidden` removes it (settings page still
   *  exposes the same controls). Mirrored onto html[data-ft-modebar]. */
  modeBarStyle: ModeBarStyle;

  // ─── Sub-surface tweaks ───
  /** Live stats container. `card` is the current strip with bg/border;
   *  `plain` drops both so the numbers float on the page; `none` makes
   *  the strip invisible (numbers still take layout space). */
  statStripSurface: StatStripSurface;
  /** Result screen chrome. `spare` drops the section cards on the
   *  post-test summary and lets the chart sit on bg. Mirrored onto
   *  html[data-ft-result]. */
  resultChrome: ResultChrome;
  /** When phase === "rest" (test hasn't started), `pulse` softly
   *  pulses the caret in primary at ~1Hz so the user sees where typing
   *  will start. Useful on bare backgrounds. */
  caretIdle: CaretIdle;
  /** Quote attribution placement on quote-mode passages. */
  quoteAttribution: QuoteAttribution;
  /** Single-accent mode. When true, --accent collapses to --muted
   *  globally so --primary is the only saturated colour anywhere
   *  (caret, error, active CTA). Mirrored onto html[data-ft-monochrome]. */
  monochromeChrome: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  // Mini stat columns visible by default — pip + value reads as
  // quieter HUD than the full text column. Burst included so all
  // four readouts have a consistent low-emphasis treatment.
  liveProgressStyle: "mini",
  liveSpeedStyle: "mini",
  liveAccuracyStyle: "mini",
  liveBurstStyle: "mini",
  // Live stats paint in the brand orange by default; users can swap
  // via customise → live stats. Empty string means "use --primary".
  liveStatsColor: "#f97316",
  liveStatsOpacity: 1,

  // Highlight off — past words stay untouched; the caret position is
  // the only "you are here" cue. Quieter passage, less visual noise.
  highlightMode: "off",
  typedEffect: "off",
  // Default ON — the underline on a skipped word is the standard
  // typing-test cue that you bailed without completing it. Power
  // users who prefer a quieter passage can flip it off.
  markIncompleteWord: true,
  // Underline mistakes — quieter than "bold" or "highlight" but still
  // unmissable against JetBrains Mono. The colour-only "color"
  // variant reads too subtle on near-monochrome palettes.
  mistakeStyle: "underline",

  // Tape mode opt-in. Multi-line is the friendlier default.
  tapeMode: "off",
  // Anchor the caret left-of-centre (25%) — the tape idiom reads as a
  // runway of upcoming text with a little typed history trailing off
  // the left, not one word floating dead-centre. Slide toward 50% to
  // centre it, toward 0 to hug the left edge.
  tapeMargin: 25,
  // Line-scroll animation on by default — the snap-to-next-line
  // feels jarring for first-time users.
  smoothLineScroll: true,
  // Four lines of context — three on top + the active line — gives
  // the eye room to plan ahead without making the passage feel
  // distant from the caret.
  linesRendered: 4,
  // 80 chars is the prose-readable column. Past that the eye has
  // to track too far per line.
  maxLineWidth: 80,

  alwaysShowDecimal: false,
  typingSpeedUnit: "wpm",
  // Graphs start at zero by default — keeps the WPM curve honest
  // for first-time viewers; users who prefer auto-scaled focus
  // ranges flip it off.
  startGraphsAtZero: true,
  // Result-screen sections default off — the chart + stat strip
  // already carry the headline read; users opt every extra
  // visualisation back in via customise > Result.
  resultShowHeatmap: false,
  resultShowExtras: false,
  resultShowPerLetter: false,
  resultShowHandBalance: false,

  keymap: "react",
  keymapLayout: "qwerty",
  keymapStyle: "staggered",
  keymapLegend: "lowercase",
  keymapTopRow: "layout",
  keymapSize: 1.0,
  keymapCompact: false,

  // Hairline borders rather than full-weight ones — quieter chrome,
  // less competition for the passage.
  borders: "soft",

  // Five-in-a-row is the default the burst surface ships with — keep
  // the streak grid feeling earned without making sessions
  // marathon-length.
  burstReps: 5,

  // Off by default — the editorial single-accent baseline (coral
  // primary only) reads cleaner. Users who want each racer in their
  // own colour flip this on from customise → multiplayer.
  multiplayerPlayerColors: false,
  // `text` is the right default *when* player colours are on —
  // letters bleeding back toward you reads more clearly than a soft
  // background band, and the band fought the typed/untyped
  // colour split in the passage. The whole marker is gated on
  // multiplayerPlayerColors so the editorial baseline stays quiet
  // until the user opts in to colours at all.
  multiplayerOpponentMarker: "text",
  multiplayerRaceFeed: true,
  multiplayerShowOpponentWpm: true,

  // ─── Surface ───
  // Monkeytype-leaning baseline: subtle card surfaces, no dividers
  // between sections, paper bg, comfortable padding. Editorial
  // preset (solid cards + hairline dividers) is one click away from
  // /customise/appearance#surface.
  cardSurfaces: "subtle",
  dividers: "hidden",
  pagePadding: "comfortable",
  backgroundFill: "paper",

  // ─── Chrome ───
  // Flat topbar (no shadow), footer visible, fade chrome on the
  // practice surface while a run is active so it doesn't compete
  // with the passage. Mode-bar chips stay as the test-mode picker.
  topbarStyle: "flat",
  footerStyle: "visible",
  autoHide: "fade",
  modeBarStyle: "chips",

  // ─── Sub-surface tweaks ───
  // `plain` preserves the historical no-chrome readouts strip; users
  // who want a panel around it pick "card" from /customise.
  statStripSurface: "plain",
  resultChrome: "framed",
  caretIdle: "off",
  quoteAttribution: "below",
  monochromeChrome: false,
};

export function useAppearancePrefs() {
  const override = usePrefsOverride()?.appearance;
  const { value: storePrefs, update: updateRaw, reset: resetRaw } =
    useRemotePrefs("appearance", DEFAULT_APPEARANCE);
  const prefs = override ?? storePrefs;
  const overridden = override != null;

  const update = useCallback(
    <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
      if (overridden) return; // read-only under a prefs override
      updateRaw({ [key]: value } as Partial<AppearancePrefs>);
    },
    [updateRaw, overridden],
  );
  const reset = useCallback(() => {
    if (!overridden) resetRaw();
  }, [resetRaw, overridden]);

  const customizedCount = useMemo(
    () =>
      (Object.keys(DEFAULT_APPEARANCE) as Array<keyof AppearancePrefs>).reduce(
        (n, k) => n + (prefs[k] !== DEFAULT_APPEARANCE[k] ? 1 : 0),
        0,
      ),
    [prefs],
  );

  return { prefs, update, reset, customizedCount } as const;
}
