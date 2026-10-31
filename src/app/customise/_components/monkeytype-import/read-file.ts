import type { MtImportErrorKind } from "./types";

/** A MonkeyType settings file is a few kilobytes; anything past this is
 *  not one, and isn't worth parsing. */
export const MAX_FILE_BYTES = 1_000_000;

export class MtImportError extends Error {
  readonly kind: MtImportErrorKind;
  constructor(kind: MtImportErrorKind) {
    super(kind);
    this.name = "MtImportError";
    this.kind = kind;
  }
}

/** Parse the text of a chosen file into MonkeyType's settings object.
 *  Throws an `MtImportError` naming what is wrong with it. */
export function readMonkeytypeFile(text: string): Record<string, unknown> {
  if (text.length > MAX_FILE_BYTES) throw new MtImportError("too-big");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new MtImportError("not-json");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new MtImportError("not-settings");
  }
  const record = json as Record<string, unknown>;
  // A flinttype export picked from the wrong menu item.
  if (record.app === "flinttype") throw new MtImportError("flinttype");
  return record;
}
