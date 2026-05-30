import type { AiChange, AiCurrentState } from "@/types/appearance-ai";
import {
  buildPalette,
  DEFAULT_PALETTE_ROLES,
  isDark,
  normalizeHarmony,
  type Oklch,
  parseColor,
  randomBase,
  randomColorForVar,
} from "./color";
import { AI_THEME_VARS, APPEARANCE_FIELDS } from "./sanitize";

/** Server-side "tools" the model can invoke instead of computing values
 *  itself (it just names what it wants; we resolve deterministically):
 *   - `randomize`: pick a tasteful random value for named fields
 *   - `palette`:   generate matching colours from a base
 *  The resolved values still pass through `sanitizePatch` afterwards, so
 *  this never widens the security boundary — it only makes the model's
 *  job easier. Pure + unit-tested. */

const THEME_VAR_SET = new Set<string>(AI_THEME_VARS);

const FONT_STACKS = [
  "'JetBrains Mono', monospace",
  "'Georgia', serif",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "'Helvetica Neue', Arial, sans-serif",
  "'Garamond', serif",
  "'Consolas', monospace",
  "Verdana, sans-serif",
];
const RADII = ["0rem", "0.25rem", "0.5rem", "0.75rem", "1rem", "1.25rem"];
const SCALES = ["0.85", "1", "1.15", "1.3", "1.6", "2"];
const SPACINGS = ["0em", "0.1em", "0.25em", "0.4em"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** A random valid value for one field (theme var or appearance key), or
 *  null if the field isn't randomisable. */
export function randomFieldValue(
  field: string,
  dark: boolean,
): string | number | boolean | null {
  if (THEME_VAR_SET.has(field)) {
    if (field === "--radius") return pick(RADII);
    if (field === "--ft-font-scale") return pick(SCALES);
    if (field === "--ft-word-spacing") return pick(SPACINGS);
    if (field === "--ft-font-family") return pick(FONT_STACKS);
    return randomColorForVar(field, dark);
  }
  const spec = APPEARANCE_FIELDS[field];
  if (!spec) return null;
  if (spec.kind === "enum") return pick(spec.values);
  if (spec.kind === "bool") return Math.random() < 0.5;
  return randInt(spec.min, spec.max);
}

export type ResolvedTools = {
  theme: Record<string, string>;
  appearance: Record<string, string | number | boolean>;
  background: Record<string, string | number>;
  changes: AiChange[];
};

function resolveBase(
  input: unknown,
  current: AiCurrentState | undefined,
): Oklch {
  if (typeof input === "string") {
    const token = input.startsWith("--")
      ? current?.theme?.[input]
      : input;
    const parsed = token ? parseColor(token) : null;
    if (parsed) return parsed;
  }
  return randomBase();
}

/** Resolve the model's `tools` directive into candidate patch buckets. */
export function resolveTools(
  tools: unknown,
  current: AiCurrentState | undefined,
): ResolvedTools {
  const out: ResolvedTools = {
    theme: {},
    appearance: {},
    background: {},
    changes: [],
  };
  if (!tools || typeof tools !== "object") return out;
  const t = tools as Record<string, unknown>;
  const dark = isDark(current?.theme?.["--background"]);

  // randomize ───────────────────────────────────────────────────────────
  if (Array.isArray(t.randomize)) {
    const done: string[] = [];
    for (const f of t.randomize) {
      if (typeof f !== "string" || done.length >= 25) continue;
      const v = randomFieldValue(f, dark);
      if (v === null) continue;
      if (THEME_VAR_SET.has(f)) out.theme[f] = v as string;
      else out.appearance[f] = v;
      done.push(f);
    }
    if (done.length > 0) {
      out.changes.push({ label: "Randomised", value: done.join(", ") });
    }
  }

  // palette ─────────────────────────────────────────────────────────────
  if (t.palette && typeof t.palette === "object") {
    const p = t.palette as Record<string, unknown>;
    const base = resolveBase(p.base, current);
    const harmony = normalizeHarmony(p.harmony);
    const roles =
      Array.isArray(p.roles) && p.roles.length > 0
        ? (p.roles.filter((r) => typeof r === "string") as string[])
        : DEFAULT_PALETTE_ROLES;
    const pal = buildPalette(base, harmony, roles, dark);
    for (const [k, v] of Object.entries(pal)) out.theme[k] = v;
    const n = Object.keys(pal).length;
    if (n > 0) {
      out.changes.push({
        label: "Palette",
        value: `${n} matching ${harmony} colours`,
      });
    }
  }

  return out;
}

/** Merge tool-resolved candidates under direct model values (direct wins
 *  on a key conflict — an explicit colour beats a tool fill). */
export function mergeBuckets(
  direct: { theme?: unknown; appearance?: unknown; background?: unknown },
  resolved: ResolvedTools,
): {
  theme: Record<string, unknown>;
  appearance: Record<string, unknown>;
  background: Record<string, unknown>;
} {
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    theme: { ...resolved.theme, ...obj(direct.theme) },
    appearance: { ...resolved.appearance, ...obj(direct.appearance) },
    background: { ...resolved.background, ...obj(direct.background) },
  };
}
