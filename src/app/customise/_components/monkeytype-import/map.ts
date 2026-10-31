import { LAYOUTS } from "@/app/_components/keyboard/layouts";
import { WORDLIST_IDS } from "@/data/wordlists/catalog";
import {
  CARET_STYLE,
  CARET_MOVEMENT,
  TIMER_STYLE,
  LIVE_STYLE,
  HIGHLIGHT,
  TYPED_EFFECT,
  TAPE,
  SPEED_UNIT,
  KEYMAP,
  KEYMAP_STYLE,
  KEYMAP_LEGEND,
  KEYMAP_KEYS,
  KEYMAP_TOP_ROW,
  STOP_ON_ERROR,
  CONFIDENCE,
  BG_FIT,
  MODE,
} from "./tables";
import { clamp, put, reader, round2, type Reader } from "./reader";
import type { MtPatches } from "./types";

/** Translate a MonkeyType `config` object into flinttype pref patches,
 *  field by field, against MonkeyType's current config schema
 *  (packages/schemas/src/configs.ts) plus the older shapes still found in
 *  saved exports. A value with no flinttype match is left out. `used`
 *  names every key that was understood, so the review can count the
 *  rest. Pure: no prefs store, no React. */
export function mapMonkeytype(mt: Record<string, unknown>): {
  patches: MtPatches;
  used: Set<string>;
} {
  const r = reader(mt);
  const patches: MtPatches = {
    caret: {},
    appearance: {},
    behaviour: {},
    background: {},
    audio: {},
    practice: {},
  };
  const { caret, appearance: a, behaviour: b, background: bg, audio } = patches;

  put(caret, "style", r.oneOf("caretStyle", CARET_STYLE));
  // MonkeyType's smooth caret glides in 150 / 100 / 85 ms. Each speed
  // lands on its own Movement preset, in the same order, so the matching
  // chip lights up after the import. Old exports stored a boolean.
  const smooth = mt.smoothCaret;
  if (typeof smooth === "boolean") {
    r.used.add("smoothCaret");
    caret.smoothSpeed = smooth ? CARET_MOVEMENT.medium : 0;
  } else {
    put(caret, "smoothSpeed", r.oneOf("smoothCaret", CARET_MOVEMENT));
  }

  put(a, "liveProgressStyle", r.oneOf("timerStyle", TIMER_STYLE));
  put(a, "liveSpeedStyle", r.oneOf("liveSpeedStyle", LIVE_STYLE));
  put(a, "liveAccuracyStyle", r.oneOf("liveAccStyle", LIVE_STYLE));
  put(a, "liveBurstStyle", r.oneOf("liveBurstStyle", LIVE_STYLE));
  const opacity = r.num("timerOpacity");
  if (opacity !== undefined) a.liveStatsOpacity = clamp(opacity, 0.1, 1);
  put(a, "highlightMode", r.oneOf("highlightMode", HIGHLIGHT));
  put(a, "typedEffect", r.oneOf("typedEffect", TYPED_EFFECT));
  put(a, "tapeMode", r.oneOf("tapeMode", TAPE));
  const margin = r.num("tapeMargin");
  if (margin !== undefined) a.tapeMargin = Math.round(clamp(margin, 0, 100));
  put(a, "smoothLineScroll", r.bool("smoothLineScroll"));
  const allLines = r.bool("showAllLines");
  // MonkeyType shows three lines unless "show all lines" is on.
  if (allLines !== undefined) a.linesRendered = allLines ? 0 : 3;
  const width = r.num("maxLineWidth");
  if (width !== undefined) a.maxLineWidth = lineWidth(width);
  put(a, "alwaysShowDecimal", r.bool("alwaysShowDecimalPlaces"));
  put(a, "typingSpeedUnit", r.oneOf("typingSpeedUnit", SPEED_UNIT));
  put(a, "startGraphsAtZero", r.bool("startGraphsAtZero"));

  put(a, "keymap", r.oneOf("keymapMode", KEYMAP));
  put(a, "keymapLayout", keymapLayout(mt, r.used));
  put(a, "keymapStyle", r.oneOf("keymapStyle", KEYMAP_STYLE));
  put(a, "keymapLegend", r.oneOf("keymapLegendStyle", KEYMAP_LEGEND));
  const keys = r.oneOf("keymapKeys", KEYMAP_KEYS);
  if (keys) Object.assign(a, keys);
  else put(a, "keymapTopRow", r.oneOf("keymapShowTopRow", KEYMAP_TOP_ROW));
  const size = r.num("keymapSize");
  if (size !== undefined) a.keymapSize = Math.round(clamp(size, 0.5, 3.5) * 10) / 10;

  put(b, "stopOnError", r.oneOf("stopOnError", STOP_ON_ERROR));
  put(b, "confidence", r.oneOf("confidenceMode", CONFIDENCE));
  put(b, "strictSpace", r.bool("strictSpace"));
  put(b, "blindMode", r.bool("blindMode"));
  // One switch here covers both of MonkeyType's.
  const punctuation = r.bool("punctuation");
  const numbers = r.bool("numbers");
  if (punctuation !== undefined || numbers !== undefined) {
    b.showSecondary = punctuation === true || numbers === true;
  }

  const click = mt.playSoundOnClick;
  if (typeof click === "string" || typeof click === "boolean") {
    r.used.add("playSoundOnClick");
    audio.keypressClickEnabled = click !== "off" && click !== false;
  }
  const volume = r.num("soundVolume");
  if (volume !== undefined) {
    audio.keypressClickVolume = Math.round(clamp(volume, 0, 1) * 20) * 5;
  }

  mapBackground(mt, r, bg);
  mapPractice(mt, r, patches.practice);
  return { patches, used: r.used };
}

function mapBackground(
  mt: Record<string, unknown>,
  r: Reader,
  bg: MtPatches["background"],
): void {
  const url = mt.customBackground;
  if (typeof url !== "string") return;
  r.used.add("customBackground");
  // No image in MonkeyType says nothing about one set here: leave it.
  if (!/^https?:\/\/\S+$/i.test(url.trim())) return;
  bg.imageUrl = url.trim();
  put(bg, "fit", r.oneOf("customBackgroundSize", BG_FIT));
  const filter = mt.customBackgroundFilter;
  if (!Array.isArray(filter)) return;
  r.used.add("customBackgroundFilter");
  // [blur px, brightness, saturation, opacity]
  const [blur, brightness, , opacity] = filter.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined,
  );
  if (blur !== undefined) bg.blur = Math.round(clamp(blur, 0, 30));
  if (opacity !== undefined) bg.opacity = clamp(opacity, 0, 1);
  // Dimming the image in MonkeyType is a darker scrim here.
  if (brightness !== undefined) bg.darken = round2(clamp(1 - brightness, 0, 1));
}

function mapPractice(
  mt: Record<string, unknown>,
  r: Reader,
  p: MtPatches["practice"],
): void {
  const mode = r.oneOf("mode", MODE);
  // Each mode keeps its size in its own key. Quote sizes are group ids
  // (0 short to 3 extra long); MonkeyType's "all" (-1) and favourites
  // (-2, -3) aren't one group, so they read as short.
  let length: number | undefined;
  if (mode === "QUOTE") {
    const raw = mt.quoteLength;
    if (raw !== undefined) r.used.add("quoteLength");
    const ids = (Array.isArray(raw) ? raw : [raw]).filter(
      (v): v is number => Number.isInteger(v) && v >= 0 && v <= 3,
    );
    length = ids.length > 0 ? Math.min(...ids) : 0;
  } else if (mode) {
    // 0 is MonkeyType's endless test, which flinttype has no match for.
    const n = r.num(mode === "TIME" ? "time" : "words");
    if (n !== undefined && Number.isInteger(n) && n >= 1 && n <= 1000) length = n;
  }
  if (mode && length !== undefined) {
    p.mode = mode;
    p.length = length;
  }
  const language = mt.language;
  if (typeof language === "string" && (WORDLIST_IDS as readonly string[]).includes(language)) {
    r.used.add("language");
    p.wordlist = language;
  }
}

/** MonkeyType's keyboard follows its typing layout unless set apart;
 *  only the layouts the on-screen keyboard can draw come over. */
function keymapLayout(mt: Record<string, unknown>, used: Set<string>): string | undefined {
  const own = mt.keymapLayout;
  const layout =
    own === "overrideSync" ? (mt.layout === "default" ? "qwerty" : mt.layout) : own;
  if (typeof layout !== "string" || !Object.hasOwn(LAYOUTS, layout)) return undefined;
  used.add("keymapLayout");
  return layout;
}

/** The Line width slider runs 30 to 200 characters, plus Full (0). */
function lineWidth(n: number): number {
  if (n <= 0 || n > 200) return 0;
  return Math.round(Math.max(30, n));
}
