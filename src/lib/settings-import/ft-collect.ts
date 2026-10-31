import type { ImportTarget, SkippedItem } from "@/types/settings-import";
import type { Candidate } from "./plan";

/** Collects what a flinttype settings file maps to: the values to
 *  write, the values that can't be used, and a count of the fields this
 *  version doesn't know (listed as one line, so a strange file can't
 *  make the list endless). Pure. */

/** Which review group an imported value belongs in. */
export type GroupOf = (target: ImportTarget) => string;

export const FT_BAD_NOTE = "The value in the file isn't one flinttype can use.";

export function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export class FtCollector {
  readonly out: Candidate[] = [];
  private readonly bad: SkippedItem[] = [];
  private unknown = 0;

  constructor(private readonly groupOf: GroupOf) {}

  add(item: Omit<Candidate, "group">): void {
    this.out.push({ ...item, group: this.groupOf(item.target) });
  }

  /** A value that fails its check. Without a label it's counted with
   *  the unrecognised fields. */
  reject(key: string, label?: string): void {
    if (label) this.bad.push({ key, label, reason: "bad-value", note: FT_BAD_NOTE });
    else this.unknown += 1;
  }

  /** A field this version doesn't know. */
  unrecognised(): void {
    this.unknown += 1;
  }

  skipped(): SkippedItem[] {
    const n = this.unknown;
    if (n === 0) return [...this.bad];
    return [
      ...this.bad,
      {
        key: "unrecognised",
        label: `${n} ${n === 1 ? "setting" : "settings"}`,
        reason: "unrecognised",
        count: n,
        note: n === 1 ? "This version of flinttype doesn't recognise it." : "This version of flinttype doesn't recognise them.",
      },
    ];
  }
}
