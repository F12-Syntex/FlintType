/** Types for the settings import (Settings → Import / export): the plan
 *  a MonkeyType or flinttype file turns into, and the reasons a file
 *  can't be used. The planners live in `src/lib/settings-import/`; the
 *  dialog in `src/app/customise/_components/import/`. */

export type ImportSource = "monkeytype" | "flinttype";

/** The prefs slices an import may write, field by field. */
export type ImportSliceKey =
  | "caret"
  | "behaviour"
  | "appearance"
  | "background"
  | "keyboard"
  | "audio"
  | "practice"
  | "handLayout";

/** Where one imported value lands. */
export type ImportTarget =
  | { kind: "slice"; slice: ImportSliceKey; field: string }
  /** A theme override (`--primary`, `--ft-font-family`, …). */
  | { kind: "theme"; name: string }
  /** The whole palette slice (flinttype files only). */
  | { kind: "palette" }
  /** Light or dark mode (next-themes, per device). */
  | { kind: "mode" };

/** One setting the import writes (or would write). */
export type ImportItem = {
  /** Stable id, e.g. "appearance.highlightMode" or "theme.--primary". */
  id: string;
  /** The settings row title ("Highlight", "Accent"). */
  label: string;
  /** The user's value now, as the settings control labels it. */
  now: string;
  /** A colour to show beside `now`. */
  nowSwatch?: string;
  /** The value after the import, as the settings control labels it. */
  to: string;
  /** A colour to show beside `to`. */
  swatch?: string;
  /** MonkeyType files: where the value came from, in MonkeyType's own
   *  words ("From Minimal", "From Sub alt"). Shown under `to` only when
   *  it says something `to` doesn't. */
  origin?: string;
  target: ImportTarget;
  /** The value written. For a theme target, `null` clears the override. */
  value: unknown;
  /** Extra fields written into the same slice with this one. */
  extra?: Record<string, unknown>;
  /** Counted and written, but not listed by name (no known label). */
  hidden?: boolean;
};

export type ImportGroup = {
  id: string;
  /** Named like the settings section or page. */
  name: string;
  /** Shown when the group is expanded: what the group does, and any
   *  part of an imported setting it leaves out, one sentence each. */
  note?: string;
  /** Settings whose value changes. Only these are counted and written. */
  items: ImportItem[];
  /** Settings the file sets to the value you already have. */
  unchanged: ImportItem[];
};

export type SkipReason =
  | "not-in-flinttype"
  | "own-way"
  | "bad-value"
  | "unrecognised";

/** A setting in the file that isn't imported. */
export type SkippedItem = {
  key: string;
  label: string;
  value?: string;
  reason: SkipReason;
  note?: string;
  /** How many settings this entry stands for (a summary line); 1 if unset. */
  count?: number;
};

/** How a MonkeyType file's settings are accounted for, each once:
 *  `used` set at least one of the review's rows, `listed` are listed as
 *  not imported, and `rest` are at MonkeyType's defaults or change
 *  nothing here. They add up to `settingsInFile`. */
export type SettingsTally = { used: number; listed: number; rest: number };

export type ImportPlan = {
  source: ImportSource;
  /** File name, or null for pasted text. */
  fileLabel: string | null;
  /** Top-level settings in the file. */
  settingsInFile: number;
  /** MonkeyType files only. */
  tally?: SettingsTally;
  /** flinttype exports only: when the file was made (ISO string). */
  exportedAt?: string;
  /** Groups in settings order; empty groups are left out. */
  groups: ImportGroup[];
  skipped: SkippedItem[];
};

export type ImportFailureKind =
  | "too-large"
  | "empty"
  | "unreadable"
  | "not-json"
  | "other-app"
  | "not-settings"
  | "newer-version"
  | "nothing-usable"
  /** Signed in, but the account's own settings haven't loaded yet. */
  | "account-unavailable";

export type ImportFailure = {
  kind: ImportFailureKind;
  /** The check step that failed: read, identify or match. */
  step: 1 | 2 | 3;
  /** Size in bytes, for "too-large". */
  size?: number;
  /** For "other-app": the app the file really comes from. */
  otherApp?: ImportSource;
};

/** The user's settings at the moment the file is matched. */
export type CurrentSettings = {
  /** Each slice merged over its defaults. */
  slices: Record<ImportSliceKey, Record<string, unknown>>;
  /** Theme overrides as stored. */
  theme: Record<string, string>;
  /** The palette slice as stored. */
  palette: { activeId: string | null } & Record<string, unknown>;
  /** next-themes setting: "light", "dark", "system", or null. */
  mode: string | null;
  /** The colour each colour setting shows on screen now (its computed
   *  value), so an unset one can show the palette's colour. */
  shownColours?: Record<string, string>;
  /** Whether an image uploaded on this device shows instead of the
   *  background image link. */
  uploadedImage?: boolean;
};
