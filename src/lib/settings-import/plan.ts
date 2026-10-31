import type {
  CurrentSettings,
  ImportGroup,
  ImportItem,
  ImportTarget,
  SettingsTally,
  SkippedItem,
} from "@/types/settings-import";
import type { ThemeVar } from "../theme-customization";
import { effectiveOverride } from "../themes/overrides";
import { colourModeLabel, sliceValueLabel } from "./labels";
import { paletteName, themeValueLabel } from "./theme-labels";

/** Shared planning steps for both imports: compare each value the file
 *  sets with the user's current one, label the current one, and gather
 *  the result into groups in settings order. Only values that differ
 *  are counted and written, so "Import 17 settings" means 17 real
 *  changes. Pure. */

/** An item before grouping: no current value yet, tagged with its
 *  group id. */
export type Candidate = Omit<ImportItem, "now" | "nowSwatch"> & { group: string };

export type GroupDef = { id: string; name: string; note?: string };
/** A sentence a planner adds to a group's note. */
export type GroupNote = { group: string; text: string };

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

/** Structural equality for JSON-shaped values. Gives up (false) past
 *  eight levels, so a hostile file can't recurse without end. */
export function sameJson(a: unknown, b: unknown, depth = 0): boolean {
  if (a === b) return true;
  if (depth > 8 || typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => sameJson(v, b[i], depth + 1))
    );
  }
  if (typeof a === "object") {
    if (Array.isArray(b)) return false;
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], depth + 1),
      )
    );
  }
  return false;
}

/** A theme override in comparable form: unset and numeric defaults
 *  ("1.0") read as undefined, colours lower-cased. */
function themeValue(name: string, v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return effectiveOverride(name as ThemeVar, v)?.toLowerCase();
}

/** True when the file sets this item to the value the user already has.
 *  Colours compare without case ("#ABC" is "#abc"); every other text,
 *  such as an image link, must match exactly. */
export function isUnchanged(c: Pick<ImportItem, "target" | "value">, cur: CurrentSettings): boolean {
  const t = c.target;
  switch (t.kind) {
    case "slice": {
      const now = cur.slices[t.slice]?.[t.field];
      if (isHex(now) && isHex(c.value)) return now.toLowerCase() === c.value.toLowerCase();
      return sameJson(now, c.value);
    }
    case "theme":
      return themeValue(t.name, cur.theme[t.name]) === themeValue(t.name, c.value);
    case "palette": {
      const next = c.value as { activeId?: unknown; base?: { id?: unknown } };
      const base = cur.palette.base as { id?: unknown } | undefined;
      return next.activeId === cur.palette.activeId && next.base?.id === base?.id;
    }
    case "mode":
      return cur.mode === c.value;
  }
}

/** The user's current value for `target`, as the settings label it. */
export function currentLabel(target: ImportTarget, cur: CurrentSettings): Pick<ImportItem, "now" | "nowSwatch"> {
  switch (target.kind) {
    case "slice": {
      const v = cur.slices[target.slice]?.[target.field];
      const now = sliceValueLabel(target.slice, target.field, v, cur.slices.practice?.mode);
      return isHex(v) ? { now, nowSwatch: v } : { now };
    }
    case "theme": {
      const v = cur.theme[target.name];
      const now = themeValueLabel(target.name, v);
      if (v) return isHex(v) ? { now, nowSwatch: v } : { now };
      // Unset: show the palette's own colour as it is on screen.
      const shown = cur.shownColours?.[target.name];
      return shown ? { now, nowSwatch: shown } : { now };
    }
    case "palette":
      return { now: paletteName(cur.palette.activeId) };
    case "mode":
      return { now: colourModeLabel(cur.mode) };
  }
}

/** Split the candidates into changed and unchanged, grouped in the
 *  order of `defs`, each with the user's current value. A group with
 *  neither is left out. `notes` follow the group's own note. */
export function buildGroups(
  defs: readonly GroupDef[],
  candidates: readonly Candidate[],
  cur: CurrentSettings,
  notes: readonly GroupNote[] = [],
): ImportGroup[] {
  const out: ImportGroup[] = [];
  for (const def of defs) {
    const mine = candidates.filter((c) => c.group === def.id);
    if (mine.length === 0) continue;
    const note = [def.note, ...notes.filter((n) => n.group === def.id).map((n) => n.text)].filter(Boolean).join(" ");
    const group: ImportGroup = { ...def, ...(note ? { note } : {}), items: [], unchanged: [] };
    for (const { group: _g, ...rest } of mine) {
      void _g;
      const item: ImportItem = { ...rest, ...currentLabel(rest.target, cur) };
      (isUnchanged(item, cur) ? group.unchanged : group.items).push(item);
    }
    out.push(group);
  }
  return out;
}

/** Settings an import of the switched-on groups would change. */
export function changeCount(
  groups: readonly ImportGroup[],
  enabled?: ReadonlySet<string>,
): number {
  return groups
    .filter((g) => !enabled || enabled.has(g.id))
    .reduce((n, g) => n + g.items.length, 0);
}

/** Settings the file sets to what the user already has. */
export function unchangedCount(groups: readonly ImportGroup[]): number {
  return groups.reduce((n, g) => n + g.unchanged.length, 0);
}

/** File settings listed as not imported: each key once, and a summary
 *  line as the settings it stands for. The review's "N not imported"
 *  shows this number. */
export function notImportedCount(skipped: readonly SkippedItem[]): number {
  const keys = new Set<string>();
  let summarised = 0;
  for (const s of skipped) {
    if (s.count !== undefined) summarised += s.count;
    else keys.add(s.key);
  }
  return keys.size + summarised;
}

/** How a file's `total` settings are accounted for, each once, given
 *  the keys the mappers read (`used`) and what is listed. A key both
 *  read and listed counts as listed; whatever is left over is the rest,
 *  never below 0. */
export function tallySettings(
  fileKeys: readonly string[],
  used: ReadonlySet<string>,
  skipped: readonly SkippedItem[],
  total: number,
): SettingsTally {
  const listedKeys = new Set(skipped.filter((s) => s.count === undefined).map((s) => s.key));
  const usedCount = fileKeys.filter((k) => used.has(k) && !listedKeys.has(k)).length;
  const listed = notImportedCount(skipped);
  return { used: usedCount, listed, rest: Math.max(0, total - usedCount - listed) };
}
