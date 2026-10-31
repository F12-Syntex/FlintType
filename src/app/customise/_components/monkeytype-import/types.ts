import type { AppearancePrefs } from "@/lib/appearance-prefs";
import type { AudioPrefs } from "@/lib/audio-prefs";
import type { BackgroundPrefs } from "@/lib/background-prefs";
import type { BehaviourPrefs } from "@/lib/behaviour-prefs";
import type { CaretSettings } from "@/lib/caret-settings";

/** The practice slice fields a MonkeyType file can set. The stored
 *  slice also carries `adapt`, which an import never touches. */
export type MtPractice = {
  mode: string;
  length: number;
  wordlist: string;
};

/** Every flinttype pref slice a MonkeyType import can write, as the
 *  settings pages read them (stored values over the defaults). */
export type MtSettings = {
  caret: CaretSettings;
  appearance: AppearancePrefs;
  behaviour: BehaviourPrefs;
  background: BackgroundPrefs;
  audio: AudioPrefs;
  practice: MtPractice;
};

export type MtSlice = keyof MtSettings;

/** What a MonkeyType file maps to, per slice. */
export type MtPatches = { [S in MtSlice]: Partial<MtSettings[S]> };

export type MtGroupId =
  | "test"
  | "typing"
  | "keyboard"
  | "stats"
  | "behaviour"
  | "background";

/** One line of the review list: a settings row title and its new value. */
export type MtRow = { label: string; value: string };

/** One step of the import: the settings it changes, and the writes. */
export type MtGroup = {
  id: MtGroupId;
  title: string;
  rows: MtRow[];
  patches: Partial<Record<MtSlice, Record<string, unknown>>>;
};

export type MtPlan = {
  groups: MtGroup[];
  /** Settings that will change. */
  changes: number;
  /** Settings in the file that already have the same value here. */
  alreadyMatch: number;
  /** Keys in the file flinttype has nothing for (theme and font aside). */
  unmatched: number;
  /** True when the file carries a theme or font, which stay as they are. */
  leavesLook: boolean;
};

export type MtImportErrorKind =
  | "too-big"
  | "not-json"
  | "not-settings"
  | "flinttype"
  | "unrecognised";
