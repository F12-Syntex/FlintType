import type { ImportSliceKey, SkippedItem } from "@/types/settings-import";
import { sliceValueLabel } from "./labels";
import type { Candidate, GroupDef, GroupNote } from "./plan";

/** Reading a MonkeyType settings file: typed readers that only see the
 *  file's own keys, plain-words value text, and the groups the import
 *  is shown in. Pure. */

export type Mt = Readonly<Record<string, unknown>>;

/** The review's groups for a MonkeyType file, in settings order. Names
 *  match the settings sections. */
export const MT_GROUPS: readonly GroupDef[] = [
  { id: "colours", name: "Colours", note: "Your palette changes to Custom, made from these colours." },
  { id: "background", name: "Background image" },
  { id: "font", name: "Font" },
  { id: "caret", name: "Caret" },
  { id: "typing", name: "Typing area" },
  { id: "keyboard", name: "On-screen keyboard" },
  { id: "live", name: "Live stats" },
  { id: "result", name: "Result screen" },
  { id: "input", name: "Input" },
  { id: "sound", name: "Sound" },
  { id: "test", name: "Test setup" },
];

/** For a value MonkeyType never saves (a wrong type or an unknown option). */
export const JUNK_NOTE = "The value in the file isn't one MonkeyType uses.";

/** The file's own value for `key`. A name like "constructor" never
 *  reads through to Object.prototype. */
export function own(mt: Mt, key: string): unknown {
  return Object.hasOwn(mt, key) ? mt[key] : undefined;
}

/** `table[key]` for a key taken from the file, matching only the
 *  table's own entries. */
export function lookup<T>(table: Readonly<Record<string, T>>, key: unknown): T | undefined {
  return typeof key === "string" && Object.hasOwn(table, key) ? table[key] : undefined;
}

export function str(mt: Mt, key: string): string | undefined {
  const v = own(mt, key);
  return typeof v === "string" ? v : undefined;
}

/** A finite number, or a numeric string ("0.5"). */
export function num(mt: Mt, key: string): number | undefined {
  const v = own(mt, key);
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function bool(mt: Mt, key: string): boolean | undefined {
  const v = own(mt, key);
  return typeof v === "boolean" ? v : undefined;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/** A fraction as a whole percentage: 0.35 → "35%". */
export const percentText = (n: number) => `${Math.round(n * 100)}%`;

/** A MonkeyType value in plain words: "next_word" → "Next word",
 *  booleans On or Off, lists joined with commas, at most 60 characters. */
export function mtText(v: unknown, nested = false): string {
  let s: string;
  if (Array.isArray(v)) {
    if (nested) return "List";
    s = v.length === 0 ? "None" : v.slice(0, 6).map((x) => mtText(x, true)).join(", ");
  } else if (typeof v === "boolean") s = v ? "On" : "Off";
  else if (typeof v === "number") s = Number.isFinite(v) ? String(v) : "None";
  else if (typeof v === "string") {
    const t = v.replace(/_+/g, " ").trim();
    s = t ? t.charAt(0).toUpperCase() + t.slice(1) : "None";
  } else s = "None";
  return s.length > 60 ? `${s.slice(0, 59)}…` : s;
}

/** Collects what a MonkeyType file maps to. Mappers mark a key as used
 *  only when it sets something (an item, or a note on one), so the
 *  leftovers can be listed as not imported or counted as the rest, and
 *  report every mapped key whose value can't be used. */
export class MtCollector {
  readonly out: Candidate[] = [];
  readonly skipped: SkippedItem[] = [];
  readonly used = new Set<string>();
  /** Sentences shown with a review group, about a setting imported in
   *  part (a theme colour with no slot here). */
  readonly notes: GroupNote[] = [];

  constructor(readonly mt: Mt) {}

  use(...keys: string[]): void {
    for (const k of keys) this.used.add(k);
  }

  note(group: string, text: string): void {
    this.notes.push({ group, text });
  }

  /** A slice field the import writes. `from` is the file's value in
   *  MonkeyType's words, shown as "From …" under the new value;
   *  `opts.origin` replaces that whole line. */
  slice(
    group: string,
    slice: ImportSliceKey,
    field: string,
    label: string,
    from: string,
    value: unknown,
    opts: { extra?: Record<string, unknown>; practiceMode?: unknown; swatch?: string; origin?: string } = {},
  ): void {
    this.out.push({
      id: `${slice}.${field}`,
      group,
      label,
      origin: opts.origin ?? `From ${from}`,
      to: sliceValueLabel(slice, field, value, opts.practiceMode),
      target: { kind: "slice", slice, field },
      value,
      ...(opts.extra ? { extra: opts.extra } : {}),
      ...(opts.swatch ? { swatch: opts.swatch } : {}),
    });
  }

  /** A theme override the import writes; `value` null clears it.
   *  `origin` is a whole line ("From Sub alt", "Picked for contrast"). */
  theme(group: string, name: string, label: string, origin: string, value: string | null, to: string, swatch?: string): void {
    this.out.push({
      id: `theme.${name}`,
      group,
      label,
      origin,
      to,
      target: { kind: "theme", name },
      value,
      ...(swatch ? { swatch } : {}),
    });
  }

  /** A value in the file that can't be used. */
  bad(key: string, label: string, note: string, value: unknown = own(this.mt, key)): void {
    this.used.add(key);
    this.skipped.push({ key, label, value: mtText(value), reason: "bad-value", note });
  }

  /** `bad`, but only when the file has the key: a missing setting is
   *  simply left alone. */
  junk(key: string, label: string, note = JUNK_NOTE): void {
    if (Object.hasOwn(this.mt, key)) this.bad(key, label, note);
  }
}
