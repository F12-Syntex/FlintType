import type { AiChange, AppearancePatch } from "@/types/appearance-ai";

/** Everything the AI is allowed to touch is whitelisted here. The model's
 *  reply is never trusted directly — only keys/values that survive these
 *  checks make it into the patch the client applies. This is the security
 *  boundary: it blocks unknown keys, out-of-range numbers, bad enums, and
 *  CSS-injection in custom-property values. Pure + unit-tested. */

/** The CSS custom properties the AI may set. Mirrors the user-overridable
 *  `THEME_VARS` in `@/lib/theme-customization`, inlined here so this
 *  server-only validator doesn't pull a `"use client"` module into the
 *  server bundle. Keep in sync if THEME_VARS grows. */
export const AI_THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
  "--ft-font-family",
  "--ft-font-scale",
  "--ft-word-spacing",
  "--ft-passage-typed",
  "--ft-passage-untyped",
  "--ft-passage-error",
] as const;

const THEME_VAR_SET = new Set<string>(AI_THEME_VARS);

/** A theme var value is a single CSS token (hex, oklch()/rgb(), a rem
 *  length, a font stack). Reject anything that could break out of the
 *  inline `style` declaration or smuggle in a side effect. */
function safeCssValue(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length === 0 || s.length > 80) return null;
  if (/[;{}<>\\]/.test(s)) return null;
  if (/url\(|@import|expression\(|javascript:/i.test(s)) return null;
  return s;
}

function sanitizeTheme(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!THEME_VAR_SET.has(key)) continue;
    const safe = safeCssValue(value);
    if (safe !== null) out[key] = safe;
  }
  return out;
}

type EnumSpec = { kind: "enum"; values: readonly string[] };
type BoolSpec = { kind: "bool" };
type IntSpec = { kind: "int"; min: number; max: number };

export const APPEARANCE_FIELDS: Record<string, EnumSpec | BoolSpec | IntSpec> = {
  tapeMode: { kind: "enum", values: ["off", "word", "letter"] },
  highlightMode: {
    kind: "enum",
    values: ["off", "letter", "word", "next-word", "next-letter"],
  },
  typedEffect: { kind: "enum", values: ["off", "fade", "strike"] },
  mistakeStyle: {
    kind: "enum",
    values: ["color", "bold", "underline", "highlight"],
  },
  caretIdle: { kind: "enum", values: ["off", "pulse"] },
  cardSurfaces: { kind: "enum", values: ["solid", "subtle", "transparent"] },
  dividers: { kind: "enum", values: ["hairline", "dotted", "hidden"] },
  backgroundFill: { kind: "enum", values: ["paper", "bare"] },
  pagePadding: { kind: "enum", values: ["comfortable", "tight", "roomy"] },
  monochromeChrome: { kind: "bool" },
  smoothLineScroll: { kind: "bool" },
  markIncompleteWord: { kind: "bool" },
  linesRendered: { kind: "int", min: 0, max: 6 },
  maxLineWidth: { kind: "int", min: 0, max: 120 },
};

function sanitizeAppearance(
  input: unknown,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const spec = APPEARANCE_FIELDS[key];
    if (!spec) continue;
    if (spec.kind === "enum") {
      if (typeof value === "string" && spec.values.includes(value)) {
        out[key] = value;
      }
    } else if (spec.kind === "bool") {
      if (typeof value === "boolean") out[key] = value;
    } else {
      if (typeof value === "number" && Number.isFinite(value)) {
        out[key] = Math.round(Math.min(spec.max, Math.max(spec.min, value)));
      }
    }
  }
  return out;
}

function safeImageUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length === 0 || s.length > 2048) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  if (/[<>"]/.test(s)) return null;
  return s;
}

function clamp(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, v));
}

function sanitizeBackground(input: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!input || typeof input !== "object") return out;
  const o = input as Record<string, unknown>;

  const url = safeImageUrl(o.imageUrl);
  if (url !== null) out.imageUrl = url;
  if (typeof o.fit === "string" && ["cover", "contain", "auto", "tile"].includes(o.fit)) {
    out.fit = o.fit;
  }
  if (typeof o.scope === "string" && ["page", "content"].includes(o.scope)) {
    out.scope = o.scope;
  }
  const opacity = clamp(o.opacity, 0, 1);
  if (opacity !== null) out.opacity = opacity;
  const blur = clamp(o.blur, 0, 30);
  if (blur !== null) out.blur = blur;
  const darken = clamp(o.darken, 0, 1);
  if (darken !== null) out.darken = darken;
  return out;
}

export function sanitizePatch(input: unknown): AppearancePatch {
  const o = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  return {
    theme: sanitizeTheme(o.theme),
    appearance: sanitizeAppearance(o.appearance),
    background: sanitizeBackground(o.background),
  };
}

export function sanitizeSummary(input: unknown): string {
  if (typeof input !== "string") return "Proposed look.";
  const s = input.trim().replace(/\s+/g, " ");
  return s.length === 0 ? "Proposed look." : s.slice(0, 200);
}

export function sanitizeChanges(input: unknown): AiChange[] {
  if (!Array.isArray(input)) return [];
  const out: AiChange[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.trim().slice(0, 60) : "";
    const value = typeof r.value === "string" ? r.value.trim().slice(0, 80) : "";
    if (label) out.push({ label, value });
    if (out.length >= 12) break;
  }
  return out;
}
