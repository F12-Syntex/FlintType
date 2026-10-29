import type { KeystrokeTimingV2, RunContext } from "@/types/capture";
import type { DigestContext, FixMode, InputKind } from "@/types/typing-analysis";
import { CODE_MATCH_MIN, SHIFTED_SYMBOLS } from "./constants";

/** How the run's settings shape the analysis (spec-10 §4.1). */

/** "block" when stop on error (or sudden death) blocks wrong keys, else
 *  "none" when backspace is off, else "fix". Stop on error wins: the
 *  reducer blocks every wrong key whatever the backspace setting, so
 *  nothing is ever left to fix. */
export function fixModeOf(ctx?: RunContext): FixMode {
  if (ctx?.stopOnError === true || ctx?.suddenDeath === true) return "block";
  if (ctx?.confidence === "all") return "none";
  return "fix";
}

/** No event with `src` → keyboard; every event from soft-keyboard or IME
 *  text → touch; otherwise mixed. */
export function inputKindOf(timings: readonly KeystrokeTimingV2[]): InputKind {
  let fromInput = 0;
  for (const t of timings) if (t.src === "input") fromInput++;
  if (fromInput === 0) return "keyboard";
  return fromInput === timings.length ? "touch" : "mixed";
}

/** QWERTY gap classes apply only to a keyboard run whose letter keydowns
 *  matched their physical key codes (`codeMatch`, spec-20 §3). The
 *  on-screen keyboard's layout setting is never read: it is a display
 *  preference that defaults to qwerty. No codeMatch (v1, the live clone,
 *  the settings preview) means plain classes. QWERTZ passes (only y and z
 *  move); Dvorak, Colemak and AZERTY fail. */
export function isQwertyKeyboard(ctx: RunContext | undefined, input: InputKind): boolean {
  return input === "keyboard" && (ctx?.codeMatch ?? 0) >= CODE_MATCH_MIN;
}

/** A character that needs Shift: an upper-case letter or a shifted symbol. */
export function isShifted(ch: string): boolean {
  if (ch.length === 0) return false;
  return ch !== ch.toLowerCase() || SHIFTED_SYMBOLS.includes(ch);
}

/** The run's settings as stored in a digest. Booleans default to false,
 *  a missing wordlist to null and a missing punctuation flag to null. */
export function digestContext(
  ctx: RunContext | undefined,
  input: InputKind,
  std: boolean,
  qwerty: boolean,
): DigestContext {
  return {
    input,
    layout: qwerty ? "qwerty" : "plain",
    std,
    wordlist: ctx?.wordlist ?? null,
    fixMode: fixModeOf(ctx),
    suddenDeath: ctx?.suddenDeath === true,
    drill: ctx?.drill === true,
    race: ctx?.race === true,
    punctuation: typeof ctx?.punctuation === "boolean" ? ctx.punctuation : null,
  };
}
