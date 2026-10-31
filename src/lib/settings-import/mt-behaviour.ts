import { WORDLIST_IDS } from "@/data/wordlists/catalog";
import { mapLength, type PracticeNow } from "./mt-length";
import { bool, clamp, lookup, mtText, num, own, percentText, str, type MtCollector } from "./mt-values";

/** MonkeyType's input, sound, test setup and background image settings,
 *  mapped onto flinttype's. A mapped key whose value can't be used is
 *  listed, never dropped silently. A key counts as used only when it
 *  sets one of yours: a volume with clicks off, or a filter with no
 *  image, changes nothing here. Pure. */

const CONFIDENCE: Record<string, string> = { off: "off", on: "word", max: "all" };
const MODES: Record<string, string> = { words: "WORDS", time: "TIME", quote: "QUOTE" };
/** MonkeyType's Max stretches the image corner to corner; Cover is the
 *  flinttype fit that also fills the screen. (Auto would show the image
 *  at its own size.) */
const FIT: Record<string, string> = { cover: "cover", contain: "contain", max: "cover" };
/** MonkeyType's click sounds are numbered ("1", "2", …). */
const CLICK_ID = /^[1-9][0-9]?$/;

export function mapInput(col: MtCollector): void {
  const { mt } = col;
  const stop = own(mt, "stopOnError");
  if (stop === "off" || stop === "letter" || stop === "word") {
    col.use("stopOnError");
    // Letter holds the caret on a wrong letter; word holds Space until
    // the word is right, which is flinttype's Strict space.
    const from = mtText(stop);
    col.slice("input", "behaviour", "stopOnError", "Stop on error", from, stop === "letter");
    col.slice("input", "behaviour", "strictSpace", "Strict space", `Stop on error: ${from}`, stop === "word");
  } else col.junk("stopOnError", "Stop on error");

  const confidenceId = own(mt, "confidenceMode");
  const confidence = lookup(CONFIDENCE, confidenceId);
  if (confidence) {
    col.use("confidenceMode");
    col.slice("input", "behaviour", "confidence", "Confidence mode", mtText(confidenceId), confidence);
  } else col.junk("confidenceMode", "Confidence mode");

  const blind = bool(mt, "blindMode");
  if (blind !== undefined) {
    col.use("blindMode");
    col.slice("input", "behaviour", "blindMode", "Blind mode", mtText(blind), blind);
  } else col.junk("blindMode", "Blind mode");
}

export function mapSound(col: MtCollector): void {
  const click = str(col.mt, "playSoundOnClick");
  const on = click !== undefined && CLICK_ID.test(click);
  if (click !== "off" && !on) {
    col.junk("playSoundOnClick", "Click sound");
    return;
  }
  col.use("playSoundOnClick");
  col.slice("sound", "audio", "keypressClickEnabled", "Key clicks", on ? `click sound ${click}` : "Off", on);
  if (!on) return;
  const volume = num(col.mt, "soundVolume");
  if (volume !== undefined) {
    col.use("soundVolume");
    const value = clamp(volume, 0, 1);
    col.slice("sound", "audio", "keypressClickVolume", "Volume", percentText(volume), Math.round(value * 100));
  } else col.junk("soundVolume", "Sound volume");
}

export function mapTestSetup(col: MtCollector, current: PracticeNow): void {
  const { mt } = col;
  const raw = own(mt, "mode");
  const mode = lookup(MODES, raw);
  if (mode) {
    col.use("mode");
    col.slice("test", "practice", "mode", "Mode", mtText(raw), mode);
    mapLength(col, mode, current);
  } else if (raw === "custom" || raw === "zen") {
    col.bad("mode", "Test mode", "Custom text and zen tests aren't available.");
  } else col.junk("mode", "Test mode");

  const language = own(mt, "language");
  if (typeof language === "string" && (WORDLIST_IDS as readonly string[]).includes(language)) {
    col.use("language");
    col.slice("test", "practice", "wordlist", "Word list", mtText(language), language);
  } else if (typeof language === "string") {
    col.bad("language", "Language", "That word list isn't available. Choose one from the mode bar.");
  } else col.junk("language", "Language");

  const punctuation = bool(mt, "punctuation");
  const numbers = bool(mt, "numbers");
  if (punctuation === undefined) col.junk("punctuation", "Punctuation");
  if (numbers === undefined) col.junk("numbers", "Numbers");
  if (punctuation !== undefined || numbers !== undefined) {
    col.use("punctuation", "numbers");
    const from = `punctuation ${punctuation ? "on" : "off"}, numbers ${numbers ? "on" : "off"}`;
    col.slice("test", "behaviour", "showSecondary", "Numbers and punctuation", from, punctuation === true || numbers === true);
  }
}

function mapBackgroundFilter(col: MtCollector): void {
  const raw = own(col.mt, "customBackgroundFilter");
  if (raw === undefined) return;
  if (!Array.isArray(raw)) return col.junk("customBackgroundFilter", "Background filter");
  const [blur, brightness, saturation, opacity] = raw.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined,
  );
  if (opacity !== undefined) {
    col.slice("background", "background", "opacity", "Opacity", percentText(opacity), clamp(opacity, 0, 1));
  }
  // Blur is in rem in MonkeyType.
  if (blur !== undefined) {
    col.slice("background", "background", "blur", "Blur", `${mtText(blur)} rem`, clamp(Math.round(blur * 16), 0, 30));
  }
  if (brightness !== undefined) {
    const darken = Math.round(clamp(1 - brightness, 0, 1) * 100) / 100;
    col.slice("background", "background", "darken", "Darken", `brightness ${mtText(brightness)}`, darken);
  }
  if (opacity === undefined && blur === undefined && brightness === undefined) return;
  col.use("customBackgroundFilter");
  // Part of a filter that is imported: said beside it, not listed.
  if (saturation !== undefined && saturation !== 1) {
    col.note("background", `Saturation can't be adjusted, so ${mtText(saturation)} isn't used.`);
  }
}

/** Said with the Background image group when this device's own upload
 *  hides the imported link (the fit and look then apply to the upload). */
export const UPLOADED_IMAGE_NOTE =
  "Your uploaded image still shows on this device instead of the link. Remove it under Background to see the link.";

export function mapBackground(col: MtCollector, uploadedImage = false): void {
  const { mt } = col;
  const raw = own(mt, "customBackground");
  if (typeof raw !== "string") return col.junk("customBackground", "Custom background");
  const url = raw.trim();
  // No image: leave the user's own background, and its look, alone. Its
  // size and filter then change nothing, in MonkeyType too.
  if (url === "") return;
  if (!/^https?:\/\/\S+$/i.test(url) || url.length > 2048) {
    col.bad("customBackground", "Custom background", "Only web image links can be used.");
    return;
  }
  col.use("customBackground");
  col.slice("background", "background", "imageUrl", "Image link", url, url);
  if (uploadedImage) col.note("background", UPLOADED_IMAGE_NOTE);
  const sizeId = own(mt, "customBackgroundSize");
  const fit = lookup(FIT, sizeId);
  if (fit) {
    col.use("customBackgroundSize");
    col.slice("background", "background", "fit", "Fit", mtText(sizeId), fit);
  } else col.junk("customBackgroundSize", "Background size");
  mapBackgroundFilter(col);
}
