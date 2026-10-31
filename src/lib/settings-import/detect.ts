import type { ImportFailure, ImportSource } from "@/types/settings-import";
import { FT_EXPORT_VERSION } from "./flinttype";
import { monkeytypeKeyCount } from "./monkeytype";

/** Step two of an import: parse the text and tell which app made it.
 *  A flinttype export carries `app: "flinttype"`; a MonkeyType settings
 *  file is a plain object with MonkeyType's setting names. Pure. */

export type Identified =
  | {
      ok: true;
      source: "monkeytype";
      payload: Record<string, unknown>;
      settingsInFile: number;
    }
  | {
      ok: true;
      source: "flinttype";
      slices: Record<string, unknown>;
      settingsInFile: number;
      exportedAt?: string;
    };

export type IdentifyResult = Identified | { ok: false; failure: ImportFailure };

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const fail = (failure: Omit<ImportFailure, "step">): IdentifyResult => ({
  ok: false,
  failure: { ...failure, step: 2 },
});

/** Settings in a flinttype export: fields across its slices, plus the
 *  palette. */
function flinttypeCount(slices: Record<string, unknown>): number {
  let n = 0;
  for (const [key, value] of Object.entries(slices)) {
    if (key === "palette") n += 1;
    else if (isObject(value)) n += Object.keys(value).length;
  }
  return n;
}

/** Which app the text comes from, checked against the import the user
 *  picked. A file from the other app is "other-app", so the dialog can
 *  offer to import it that way instead. */
export function identify(text: string, expected: ImportSource): IdentifyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail({ kind: "not-json" });
  }
  if (!isObject(parsed)) return fail({ kind: "not-settings" });

  let found: Identified | null = null;
  if (parsed.app === "flinttype") {
    if (typeof parsed.version !== "number" || !isObject(parsed.slices)) {
      return fail({ kind: "not-settings" });
    }
    if (parsed.version > FT_EXPORT_VERSION) return fail({ kind: "newer-version" });
    const at = typeof parsed.exportedAt === "string" ? parsed.exportedAt : "";
    found = {
      ok: true,
      source: "flinttype",
      slices: parsed.slices,
      settingsInFile: flinttypeCount(parsed.slices),
      ...(at && !Number.isNaN(Date.parse(at)) ? { exportedAt: at } : {}),
    };
  } else if (monkeytypeKeyCount(parsed) >= 2) {
    found = {
      ok: true,
      source: "monkeytype",
      payload: parsed,
      settingsInFile: Object.keys(parsed).length,
    };
  }
  if (!found) return fail({ kind: "not-settings" });
  if (found.source !== expected) return fail({ kind: "other-app", otherApp: found.source });
  return found;
}
