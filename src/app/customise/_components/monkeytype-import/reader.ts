export type Reader = ReturnType<typeof reader>;

/** Reads MonkeyType config values, noting each key it understood. */
export function reader(mt: Record<string, unknown>) {
  const used = new Set<string>();
  return {
    used,
    /** The flinttype value for a MonkeyType enum, or undefined. */
    oneOf<T>(key: string, table: Readonly<Record<string, T>>): T | undefined {
      const v = mt[key];
      if (typeof v !== "string" || !Object.hasOwn(table, v)) return undefined;
      used.add(key);
      return table[v];
    },
    bool(key: string): boolean | undefined {
      const v = mt[key];
      if (typeof v !== "boolean") return undefined;
      used.add(key);
      return v;
    },
    /** A finite number, also from the numeric strings old exports hold. */
    num(key: string): number | undefined {
      const v = mt[key];
      const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
      if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
      used.add(key);
      return n;
    },
  };
}

/** Set `key` unless the value is missing. */
export function put<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
