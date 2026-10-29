/** The practice tables' key column (spec-40 §3.4): wide enough for the
 *  longest key, so a word never breaks partway. `text-sm` IBM Plex Mono
 *  is 0.6em a character. The width sits between room for the header and
 *  a cap that still leaves the figure and its bar room:
 *  - 16 characters on a phone (375px);
 *  - 24 from `sm`, where one card has the row to itself;
 *  - 18 from `lg` to `xl`, where the two cards sit side by side and are
 *    at their narrowest;
 *  - 24 again from `xl`.
 *  Only a key longer than the cap wraps, as a last resort. */
const KEY_MIN_CHARS = 4;
export const KEY_MAX_CHARS = { phone: 16, wide: 24, twoUp: 18 } as const;
const CHAR_REM = 0.6 * 0.875;
/** The cell's right padding (`pr-3`). */
const PADDING_REM = 0.75;

export function keyColumnChars(keys: readonly { key: string }[], cap: number = KEY_MAX_CHARS.phone): number {
  const longest = Math.max(0, ...keys.map((r) => [...r.key].length));
  return Math.min(cap, Math.max(KEY_MIN_CHARS, longest));
}

const widthOf = (chars: number) => `calc(${Math.round(chars * CHAR_REM * 1000) / 1000}rem + ${PADDING_REM}rem)`;

/** CSS widths for the key `<col>`, one per cap, in rem so they follow
 *  the app size. pattern-table.tsx picks one per breakpoint. */
export function keyColumnWidths(keys: readonly { key: string }[]): Record<keyof typeof KEY_MAX_CHARS, string> {
  return {
    phone: widthOf(keyColumnChars(keys, KEY_MAX_CHARS.phone)),
    wide: widthOf(keyColumnChars(keys, KEY_MAX_CHARS.wide)),
    twoUp: widthOf(keyColumnChars(keys, KEY_MAX_CHARS.twoUp)),
  };
}
