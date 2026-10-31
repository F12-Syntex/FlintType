import type { ImportItem, ImportSliceKey } from "@/types/settings-import";
import { clearSlice, readSlice, restoreSync, settlePrefs, writeSlice } from "../prefs-store";
import { clearThemeVar, setThemeVar, type ThemeOverrides, type ThemeVar } from "../theme-customization";
import { paletteAfterOverrideWrite, type PaletteSlice } from "../themes/palette-fork";
import { CUSTOM_THEME_ID } from "../themes/registry";
import { rawSlice } from "./slices";
import {
  asImport, canUndo, recordsToRestore, rememberField, rememberSlice, type UndoPoint,
} from "./undo-point";

/** Writing an import, and taking it back. Every write is field by field
 *  through the same store writes the settings controls make, so an
 *  import changes only what it lists; nothing else in any slice moves.
 *  What each write replaces is kept in the undo point (`undo-point.ts`),
 *  so Undo puts back exactly what was there. Undo runs only while the
 *  store still belongs to whoever imported. */

/** How the light or dark mode is read and set (next-themes, per device). */
export type ModeAccess = {
  get: () => string | null;
  set: (mode: string) => void;
};

/** Write `items` (one review group, say), recording what they replace. */
export function applyItems(items: readonly ImportItem[], undo: UndoPoint, mode: ModeAccess): void {
  asImport(undo, () => writeItems(items, undo, mode));
}

function writeItems(items: readonly ImportItem[], undo: UndoPoint, mode: ModeAccess): void {
  const touchesPalette = items.some((i) => i.target.kind === "theme" || i.target.kind === "palette");
  if (touchesPalette && !undo.palette) {
    rememberSlice(undo, "palette");
    rememberSlice(undo, "theme");
    undo.palette = { ...rawSlice("palette") };
  }

  const patches = new Map<ImportSliceKey, Record<string, unknown>>();
  for (const item of items) {
    if (item.target.kind !== "slice") continue;
    const { slice, field } = item.target;
    const patch = patches.get(slice) ?? {};
    patch[field] = item.value;
    Object.assign(patch, item.extra);
    patches.set(slice, patch);
  }
  for (const [slice, patch] of patches) {
    const fields = Object.keys(patch);
    for (const f of fields) rememberField(undo, slice, f);
    writeSlice(slice, { ...rawSlice(slice), ...patch }, fields);
  }

  for (const item of items) {
    const t = item.target;
    if (t.kind === "theme") {
      if (!undo.theme.has(t.name)) {
        const prev = rawSlice("theme")[t.name];
        undo.theme.set(t.name, typeof prev === "string" ? prev : undefined);
      }
      if (typeof item.value === "string") setThemeVar(t.name as ThemeVar, item.value);
      else clearThemeVar(t.name as ThemeVar);
    } else if (t.kind === "mode" && typeof item.value === "string") {
      if (undo.mode === undefined) undo.mode = mode.get();
      mode.set(item.value);
    }
  }
  // Last, so the colour writes above can't settle it somewhere else.
  // Then settled against the overrides now in place, as a colour change
  // would be: a palette with overrides it doesn't set reads Custom.
  for (const item of items) {
    if (item.target.kind !== "palette") continue;
    const overrides = readSlice<ThemeOverrides>("theme", {});
    writeSlice("palette", paletteAfterOverrideWrite(item.value as PaletteSlice, overrides, CUSTOM_THEME_ID));
  }
}

/** Drop a slice the import created, once nothing is left in it. */
function dropIfCreated(undo: UndoPoint, key: string): void {
  if (undo.before.get(key)?.existed !== false) return;
  const raw = rawSlice(key);
  if (Object.keys(raw).length === 0) clearSlice(key);
}

/** Put back every value the import replaced, and nothing else. A slice
 *  someone else reset since is left as they left it. */
function putBack(undo: UndoPoint): void {
  const theirs = (key: string) => undo.resetByOthers.has(key);
  for (const [slice, fields] of undo.slices) {
    if (theirs(slice)) continue;
    const next = { ...rawSlice(slice) };
    for (const [field, prior] of fields) {
      if (prior.had) next[field] = prior.value;
      else delete next[field];
    }
    writeSlice(slice, next, [...fields.keys()]);
    dropIfCreated(undo, slice);
  }
  for (const [name, prior] of theirs("theme") ? [] : undo.theme) {
    if (prior === undefined || prior === "") clearThemeVar(name as ThemeVar);
    else setThemeVar(name as ThemeVar, prior);
  }
  dropIfCreated(undo, "theme");
  // After the colours, which re-settle the palette as they go.
  if (undo.palette && !theirs("palette")) {
    if (undo.before.get("palette")?.existed === false) clearSlice("palette");
    else writeSlice("palette", undo.palette);
  }
}

/** Undo the import. Returns null, having written nothing, when the
 *  store has changed owner (`canUndo`). Otherwise every value is back
 *  when this returns, and the promise settles the store's save record:
 *  once no save is in flight, a record the import never got to the
 *  server is put back as it was, so nothing the import wrote is left to
 *  save or remove (a signed-out visitor who signs in later keeps their
 *  account's settings), while a setting the import didn't write that
 *  someone else changed meanwhile is still saved. When the import did
 *  reach the server, the values put back are saved like any edit. */
export function undoImport(undo: UndoPoint, mode: ModeAccess): Promise<void> | null {
  if (!canUndo(undo)) return null;
  asImport(undo, () => putBack(undo));
  if (undo.mode !== undefined) mode.set(undo.mode ?? "system");
  return settleUndo(undo);
}

async function settleUndo(undo: UndoPoint): Promise<void> {
  await settlePrefs();
  // A sign-in or sign-out while the save was in flight: the record isn't ours.
  if (!canUndo(undo)) return;
  restoreSync(undo.version, undo.own, recordsToRestore(undo));
}
