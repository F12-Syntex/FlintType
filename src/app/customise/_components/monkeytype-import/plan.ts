import { mapMonkeytype } from "./map";
import { MtImportError } from "./read-file";
import { GROUP_TITLES, ROW_SPECS } from "./rows";
import type { MtGroup, MtGroupId, MtPlan, MtSettings, MtSlice } from "./types";

/** MonkeyType keys for its theme and font. flinttype keeps its own look,
 *  so these stay out of an import and the review says so. */
const LOOK_KEYS = new Set([
  "theme",
  "themeLight",
  "themeDark",
  "autoSwitchTheme",
  "customTheme",
  "customThemeColors",
  "favThemes",
  "randomTheme",
  "flipTestColors",
  "colorfulMode",
  "timerColor",
  "fontFamily",
  "fontSize",
]);

const GROUP_ORDER: readonly MtGroupId[] = [
  "test",
  "typing",
  "keyboard",
  "stats",
  "behaviour",
  "background",
];

/** Work out what importing `mt` would change, against the settings as
 *  they are now. Only settings whose value differs make the list, and
 *  each group carries exactly the fields it writes, so applying a plan
 *  never touches anything it didn't show. Throws `unrecognised` when no
 *  value in the file maps onto a flinttype setting. */
export function planMonkeytypeImport(
  mt: Record<string, unknown>,
  current: MtSettings,
): MtPlan {
  const { patches, used } = mapMonkeytype(mt);

  const next = {} as MtSettings;
  for (const slice of Object.keys(current) as MtSlice[]) {
    (next as Record<MtSlice, unknown>)[slice] = { ...current[slice], ...patches[slice] };
  }

  const groups = new Map<MtGroupId, MtGroup>();
  let changes = 0;
  let alreadyMatch = 0;
  for (const spec of ROW_SPECS) {
    const patch = patches[spec.slice] as Record<string, unknown>;
    if (!spec.fields.every((f) => f in patch)) continue;
    if (spec.when && !spec.when(next)) continue;
    const now = current[spec.slice] as Record<string, unknown>;
    if (spec.fields.every((f) => Object.is(now[f], patch[f]))) {
      alreadyMatch += 1;
      continue;
    }
    changes += 1;
    let group = groups.get(spec.group);
    if (!group) {
      group = { id: spec.group, title: GROUP_TITLES[spec.group], rows: [], patches: {} };
      groups.set(spec.group, group);
    }
    group.rows.push({ label: spec.label, value: spec.format(next) });
    const writes = (group.patches[spec.slice] ??= {});
    for (const f of spec.fields) writes[f] = patch[f];
  }

  // Nothing in the file maps onto a setting here (already matching counts).
  if (changes + alreadyMatch === 0) throw new MtImportError("unrecognised");

  const keys = Object.keys(mt);
  return {
    groups: GROUP_ORDER.flatMap((id) => groups.get(id) ?? []),
    changes,
    alreadyMatch,
    unmatched: keys.filter((k) => !used.has(k) && !LOOK_KEYS.has(k)).length,
    leavesLook: keys.some((k) => LOOK_KEYS.has(k)),
  };
}
