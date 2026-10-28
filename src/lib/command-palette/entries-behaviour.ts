import type { AudioPrefs } from "@/lib/audio-prefs";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import { enumEntry, link, type Setter, toggle } from "./entry-helpers";
import type { CommandEntry } from "./types";

/** Settings → Behaviour: input handling, word list, sound and
 *  adaptive practice. */
export function behaviourEntries({
  bp,
  setBp,
  audio,
  setAudio,
}: {
  bp: BehaviourPrefs;
  setBp: Setter<BehaviourPrefs>;
  audio: AudioPrefs;
  setAudio: Setter<AudioPrefs>;
}): CommandEntry[] {
  return [
    toggle(
      "b.stopOnError",
      "Stop on error",
      "Don't move on until a wrong letter is fixed",
      "Behaviour",
      bp.stopOnError,
      (v) => setBp("stopOnError", v),
      ["practice", "errors", "strict"],
    ),
    enumEntry(
      "b.confidence",
      "Confidence mode",
      "Word stops you going back to earlier words; All turns backspace off",
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
    toggle(
      "b.allowExtras",
      "Allow extra letters",
      "Type past the end of a word; extra letters count as mistakes",
      "Behaviour",
      bp.allowExtras,
      (v) => setBp("allowExtras", v),
      ["practice", "extras"],
    ),
    toggle(
      "b.strictSpace",
      "Strict space",
      "Space only moves on once the word is typed correctly",
      "Behaviour",
      bp.strictSpace,
      (v) => setBp("strictSpace", v),
      ["practice", "space", "monkeytype"],
    ),
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
      "b.showSecondary",
      "Numbers and punctuation",
      "Mix numbers and punctuation into word tests",
      "Behaviour",
      bp.showSecondary,
      (v) => setBp("showSecondary", v),
      ["numbers", "punctuation", "symbols", "digits", "word list"],
    ),
    toggle(
      "a.keypressClickEnabled",
      "Key clicks",
      "Play a short click on every keystroke",
      "Behaviour",
      audio.keypressClickEnabled,
      (v) => setAudio("keypressClickEnabled", v),
      ["audio", "sound", "click", "key", "typing"],
    ),
    link(
      "a.keypressClickVolume",
      "Key click volume",
      audio.keypressClickEnabled
        ? "Open the volume slider"
        : "Turn on key clicks to set the volume",
      "Behaviour",
      "/customise/behaviour#audio",
      "Behaviour · Sound",
      ["audio", "sound", "click", "volume"],
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
  ];
}
