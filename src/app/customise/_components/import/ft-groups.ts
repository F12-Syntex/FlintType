import type { GroupDef } from "@/lib/settings-import/plan";
import type { ImportTarget } from "@/types/settings-import";
import {
  GROUP_APPEARANCE_KEYS,
  GROUP_THEME_VARS,
  SETTINGS_GROUPS,
  type SettingsGroupId,
} from "../groups";

/** The review groups for a flinttype file: one per settings page, in
 *  sidebar order, then the test setup the mode bar keeps. Pure. */

export const FT_GROUP_DEFS: readonly GroupDef[] = [
  ...SETTINGS_GROUPS.map((g) => ({ id: g.id, name: g.name })),
  { id: "test", name: "Test setup" },
];

function pageOwning<T extends string>(table: Partial<Record<SettingsGroupId, readonly T[]>>, key: string): string | null {
  for (const [page, keys] of Object.entries(table) as [SettingsGroupId, readonly T[]][]) {
    if (keys.includes(key as T)) return page;
  }
  return null;
}

const SLICE_PAGE: Record<string, SettingsGroupId | "test"> = {
  caret: "typing",
  background: "theme",
  keyboard: "keyboard",
  handLayout: "keyboard",
  behaviour: "behaviour",
  audio: "behaviour",
  practice: "test",
};

/** The page a value is set on. */
export function ftGroupOf(target: ImportTarget): string {
  switch (target.kind) {
    case "theme":
      return pageOwning(GROUP_THEME_VARS, target.name) ?? "theme";
    case "palette":
    case "mode":
      return "theme";
    case "slice":
      if (target.slice === "behaviour" && target.field === "showSecondary") return "behaviour";
      if (target.slice === "appearance") {
        return pageOwning(GROUP_APPEARANCE_KEYS, target.field) ?? "behaviour";
      }
      return SLICE_PAGE[target.slice] ?? "behaviour";
  }
}
