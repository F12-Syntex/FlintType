import type {
  CurrentSettings,
  ImportPlan,
  ImportSliceKey,
  ImportTarget,
} from "@/types/settings-import";
import { LIVE_STATS_COLOR_PICKED, liveStatsColorOf } from "../live-stats-color-prefs";
import { FtCollector, isObject, type GroupOf } from "./ft-collect";
import { FT_FIELDS, validValue, type Field } from "./ft-fields";
import { planColours } from "./ft-theme";
import { defaultLengthFor, fallbackLength, validHandLayout, validLength } from "./ft-values";
import { sliceValueLabel } from "./labels";
import { buildGroups, type GroupDef } from "./plan";
import { SLICE_DEFAULTS } from "./slices";

/** Plan a flinttype settings import. A slice in the file is the whole
 *  of that slice, as in an export: a known field it doesn't have goes
 *  back to its default (a field at its default was left out of older
 *  exports), so restoring a backup really restores it. Every value is
 *  checked against its spec first, and only real changes are listed.
 *  Pure. */

export const FT_EXPORT_VERSION = 1;

type Data = Record<string, unknown>;

function addField(
  col: FtCollector,
  slice: ImportSliceKey,
  field: string,
  def: Field,
  value: unknown,
  practiceMode?: unknown,
): void {
  const target: ImportTarget = { kind: "slice", slice, field };
  const colour = slice === "appearance" && field === "liveStatsColor";
  col.add({
    id: `${slice}.${field}`,
    label: def.label ?? field,
    to: sliceValueLabel(slice, field, value, practiceMode),
    target,
    value,
    ...(colour ? { extra: { [LIVE_STATS_COLOR_PICKED]: true } } : {}),
    ...(colour && typeof value === "string" && value ? { swatch: value } : {}),
    ...(def.label ? {} : { hidden: true }),
  });
}

/** The file's value for `field`, else the field's default. */
function valueIn(slice: ImportSliceKey, data: Data, field: string): { has: boolean; raw: unknown } {
  const has = Object.hasOwn(data, field);
  return { has, raw: has ? data[field] : (SLICE_DEFAULTS[slice] as Data)[field] };
}

/** Mode and length are checked as a pair, so a test can always run:
 *  the length must suit the mode it lands on. */
function planPractice(col: FtCollector, data: Data, current: CurrentSettings): void {
  const fields = FT_FIELDS.practice;
  const m = valueIn("practice", data, "mode");
  const mode = validValue(fields.mode.spec, m.raw);
  if (mode === undefined) col.reject("practice.mode", fields.mode.label);
  else addField(col, "practice", "mode", fields.mode, mode);
  const landsOn = mode ?? current.slices.practice.mode;

  const l = valueIn("practice", data, "length");
  let length = validLength(landsOn, l.has ? l.raw : defaultLengthFor(landsOn));
  if (length === undefined) {
    col.reject("practice.length", fields.length.label);
    length = fallbackLength(landsOn, current.slices.practice);
  }
  if (length !== undefined) addField(col, "practice", "length", fields.length, length, landsOn);

  for (const field of ["adapt", "wordlist"] as const) {
    const v = valueIn("practice", data, field);
    const value = validValue(fields[field].spec, v.raw);
    if (value === undefined) col.reject(`practice.${field}`, fields[field].label);
    else addField(col, "practice", field, fields[field], value);
  }
}

function planSlice(col: FtCollector, slice: ImportSliceKey, data: Data, current: CurrentSettings): void {
  const fields = FT_FIELDS[slice];
  for (const key of Object.keys(data)) {
    const known = slice === "handLayout" ? key === "fingers" : Object.hasOwn(fields, key);
    const stamp = slice === "appearance" && key === LIVE_STATS_COLOR_PICKED;
    if (!known && !stamp) col.unrecognised();
  }
  if (slice === "practice") return planPractice(col, data, current);
  if (slice === "handLayout") {
    const v = valueIn(slice, data, "fingers");
    const value = validHandLayout(v.raw);
    if (!value) col.reject("handLayout.fingers", "Hand layout");
    else addField(col, slice, "fingers", { spec: { kind: "bool" }, label: "Hand layout" }, value);
    return;
  }
  for (const [field, def] of Object.entries(fields)) {
    const v = valueIn(slice, data, field);
    let value = validValue(def.spec, v.raw);
    if (value === undefined) {
      if (v.has) col.reject(`${slice}.${field}`, def.label);
      continue;
    }
    // An unstamped old default hex means "follow the palette".
    if (slice === "appearance" && field === "liveStatsColor" && v.has) value = liveStatsColorOf(data);
    addField(col, slice, field, def, value);
  }
}

export function planFlinttype(
  slices: Data,
  current: CurrentSettings,
  meta: { fileLabel: string | null; settingsInFile: number; exportedAt?: string },
  groups: readonly GroupDef[],
  groupOf: GroupOf,
): ImportPlan {
  const col = new FtCollector(groupOf);
  for (const key of Object.keys(slices)) {
    if (!Object.hasOwn(FT_FIELDS, key) && key !== "theme" && key !== "palette") col.unrecognised();
  }
  for (const slice of Object.keys(FT_FIELDS) as ImportSliceKey[]) {
    const data = Object.hasOwn(slices, slice) ? slices[slice] : undefined;
    if (data === undefined) continue;
    if (isObject(data)) planSlice(col, slice, data, current);
    else col.unrecognised();
  }
  planColours(col, slices, current);
  return {
    source: "flinttype",
    fileLabel: meta.fileLabel,
    settingsInFile: meta.settingsInFile,
    ...(meta.exportedAt ? { exportedAt: meta.exportedAt } : {}),
    groups: buildGroups(groups, col.out, current),
    skipped: col.skipped(),
  };
}
