import type { ImportFailure } from "@/types/settings-import";

/** Step one of an import: get the text out of a chosen file or the
 *  paste box, refusing anything too big to be a settings file before
 *  reading it. */

/** Settings files are a few KB; 1 MB is far beyond any real one. */
export const MAX_IMPORT_BYTES = 1_048_576;

export type ReadResult =
  | { ok: true; text: string; bytes: number }
  | { ok: false; failure: ImportFailure };

/** "Under 1 KB", "4 KB", "3.2 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return "Under 1 KB";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const tooLarge = (size: number): ReadResult => ({
  ok: false,
  failure: { kind: "too-large", step: 1, size },
});

/** Check pasted or read text: too large, or nothing but spaces. */
export function checkText(text: string, bytes: number): ReadResult {
  if (bytes > MAX_IMPORT_BYTES) return tooLarge(bytes);
  if (text.trim() === "") return { ok: false, failure: { kind: "empty", step: 1 } };
  return { ok: true, text, bytes };
}

/** The UTF-8 size of a string, without encoding more than needed. */
export function textBytes(text: string): number {
  // Each UTF-16 unit is at most 3 bytes, so short text skips the encode.
  if (text.length * 3 <= MAX_IMPORT_BYTES) return new TextEncoder().encode(text).length;
  if (text.length > MAX_IMPORT_BYTES) return text.length;
  return new TextEncoder().encode(text).length;
}

/** Read a chosen file, or check pasted text. */
export async function readInput(
  input: { file: Blob } | { text: string },
): Promise<ReadResult> {
  if ("text" in input) return checkText(input.text, textBytes(input.text));
  const { file } = input;
  if (file.size > MAX_IMPORT_BYTES) return tooLarge(file.size);
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, failure: { kind: "unreadable", step: 1 } };
  }
  return checkText(text, file.size);
}
