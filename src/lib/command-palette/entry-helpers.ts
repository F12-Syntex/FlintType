import type { EnumEntry, LinkEntry, ToggleEntry } from "./types";

/** A typed per-key setter, the shape every pref hook's `update` has. */
export type Setter<P> = <K extends keyof P>(key: K, value: P[K]) => void;

export function toggle(
  id: string,
  label: string,
  hint: string,
  group: ToggleEntry["group"],
  value: boolean,
  set: (next: boolean) => void,
  keywords?: readonly string[],
): ToggleEntry {
  return { id, label, hint, group, kind: "toggle", value, set, keywords };
}

export function enumEntry<T extends string>(
  id: string,
  label: string,
  hint: string,
  group: EnumEntry["group"],
  value: T,
  options: readonly { id: T; label: string }[],
  set: (next: T) => void,
  keywords?: readonly string[],
): EnumEntry {
  // The underlying EnumEntry type widens id/value/set to `string` so
  // the discriminated union stays simple. The helper preserves
  // narrowness at the call site (caller passes a T-narrow `set` and
  // option list) and the cast below is the single boundary where it
  // widens.
  return {
    id,
    label,
    hint,
    group,
    kind: "enum",
    value,
    options,
    set: set as (next: string) => void,
    keywords,
  };
}

export function link(
  id: string,
  label: string,
  hint: string,
  group: LinkEntry["group"],
  href: string,
  destination: string,
  keywords?: readonly string[],
): LinkEntry {
  return { id, label, hint, group, kind: "link", href, destination, keywords };
}
